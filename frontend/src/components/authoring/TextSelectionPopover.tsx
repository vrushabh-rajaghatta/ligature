

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  MessageSquare,
  AlertTriangle,
  HelpCircle,
  Lightbulb,
  X,
  Send,
  Highlighter
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

export interface TextSelection {
  text: string;
  startOffset: number;
  endOffset: number;
  sectionId: string;
  sectionTitle: string;
  rect: DOMRect;
}

export interface AnchoredCommentData {
  sectionId: string;
  anchorText: string;
  anchorStart: number;
  anchorEnd: number;
  type: 'comment' | 'suggestion' | 'question' | 'issue';
  priority: 'editorial' | 'minor' | 'major' | 'critical';
  content: string;
}

interface TextSelectionPopoverProps {
  selection: TextSelection | null;
  onCreateComment: (data: AnchoredCommentData) => void;
  onHighlight?: (selection: TextSelection) => void;
  onClose: () => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function TextSelectionPopover({
  selection,
  onCreateComment,
  onHighlight,
  onClose,
}: TextSelectionPopoverProps) {
  const [mode, setMode] = useState<'quick' | 'full'>('quick');
  const [commentType, setCommentType] = useState<'comment' | 'suggestion' | 'question' | 'issue'>('comment');
  const [priority, setPriority] = useState<'editorial' | 'minor' | 'major' | 'critical'>('minor');
  const [content, setContent] = useState('');
  const popoverRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Position the popover above the selection
  const getPopoverStyle = useCallback(() => {
    if (!selection) return { display: 'none' };
    
    const rect = selection.rect;
    const popoverWidth = mode === 'quick' ? 280 : 320;
    const popoverHeight = mode === 'quick' ? 48 : 280;
    
    // Center horizontally above the selection
    let left = rect.left + (rect.width / 2) - (popoverWidth / 2);
    let top = rect.top - popoverHeight - 10;
    
    // Keep within viewport
    if (left < 10) left = 10;
    if (left + popoverWidth > window.innerWidth - 10) {
      left = window.innerWidth - popoverWidth - 10;
    }
    if (top < 10) {
      top = rect.bottom + 10; // Show below if no room above
    }
    
    return {
      position: 'fixed' as const,
      left: `${left}px`,
      top: `${top}px`,
      zIndex: 1000,
    };
  }, [selection, mode]);

  // Focus textarea when expanding
  useEffect(() => {
    if (mode === 'full' && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [mode]);

  // Close on escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const handleQuickAction = (type: typeof commentType) => {
    setCommentType(type);
    setMode('full');
  };

  const handleSubmit = () => {
    if (!selection || !content.trim()) return;
    
    onCreateComment({
      sectionId: selection.sectionId,
      anchorText: selection.text,
      anchorStart: selection.startOffset,
      anchorEnd: selection.endOffset,
      type: commentType,
      priority,
      content: content.trim(),
    });
    
    // Reset
    setContent('');
    setMode('quick');
    onClose();
  };

  if (!selection) return null;

  const typeConfig = {
    comment: { icon: MessageSquare, label: 'Comment', color: 'text-blue-400', bg: 'bg-blue-500/20' },
    suggestion: { icon: Lightbulb, label: 'Suggestion', color: 'text-green-400', bg: 'bg-green-500/20' },
    question: { icon: HelpCircle, label: 'Question', color: 'text-purple-400', bg: 'bg-purple-500/20' },
    issue: { icon: AlertTriangle, label: 'Issue', color: 'text-red-400', bg: 'bg-red-500/20' },
  };

  return (
    <div
      ref={popoverRef}
      style={getPopoverStyle()}
      className="bg-surface-elevated border border-border rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
    >
      {mode === 'quick' ? (
        /* Quick Action Bar */
        <div className="flex items-center gap-1 p-2">
          {onHighlight && (
            <button
              onClick={() => onHighlight(selection)}
              className="p-2 hover:bg-surface-card rounded-lg transition-colors group"
              title="Highlight"
            >
              <Highlighter className="w-4 h-4 text-yellow-400" />
            </button>
          )}
          <div className="w-px h-6 bg-border mx-1" />
          {Object.entries(typeConfig).map(([type, config]) => (
            <button
              key={type}
              onClick={() => handleQuickAction(type as typeof commentType)}
              className={`p-2 hover:${config?.bg ?? ''} rounded-lg transition-colors group`}
              title={config.label}
            >
              <config.icon className={`w-4 h-4 ${config?.color ?? ''}`} />
            </button>
          ))}
          <div className="w-px h-6 bg-border mx-1" />
          <button
            onClick={onClose}
            className="p-2 hover:bg-surface-card rounded-lg transition-colors"
            title="Cancel"
          >
            <X className="w-4 h-4 text-text-muted" />
          </button>
        </div>
      ) : (
        /* Full Comment Form */
        <div className="w-80">
          {/* Header with selected text preview */}
          <div className="px-4 py-3 border-b border-border bg-surface-card/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-text-muted">Selected Text</span>
              <button onClick={onClose} className="p-1 hover:bg-surface rounded">
                <X className="w-4 h-4 text-text-muted" />
              </button>
            </div>
            <div className="text-sm text-text-primary bg-accent-blue/10 border-l-2 border-accent-blue px-2 py-1 rounded-r line-clamp-2">
              "{selection.text}"
            </div>
          </div>

          {/* Comment Form */}
          <div className="p-4 space-y-3">
            {/* Type Selector */}
            <div className="flex gap-1">
              {Object.entries(typeConfig).map(([type, config]) => (
                <button
                  key={type}
                  onClick={() => setCommentType(type as typeof commentType)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-colors ${
                    commentType === type
                      ? `${config?.bg ?? ''} ${config?.color ?? ''}`
                      : 'bg-surface-card text-text-muted hover:text-text-primary'
                  }`}
                >
                  <config.icon className="w-3.5 h-3.5" />
                  {config.label}
                </button>
              ))}
            </div>

            {/* Priority Selector */}
            <div className="flex gap-1">
              {(['editorial', 'minor', 'major', 'critical'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPriority(p)}
                  className={`flex-1 py-1.5 rounded text-xs font-medium transition-colors ${
                    priority === p
                      ? p === 'critical' ? 'bg-red-500/20 text-red-400'
                        : p === 'major' ? 'bg-amber-500/20 text-amber-400'
                        : p === 'minor' ? 'bg-blue-500/20 text-blue-400'
                        : 'bg-slate-500/20 text-slate-400'
                      : 'bg-surface-card text-text-muted hover:text-text-primary'
                  }`}
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>

            {/* Content */}
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={`Add your ${commentType}...`}
              rows={3}
              className="w-full px-3 py-2 bg-surface-card border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-blue resize-none"
            />

            {/* Actions */}
            <div className="flex justify-between items-center">
              <button
                onClick={() => setMode('quick')}
                className="text-xs text-text-muted hover:text-text-primary"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!content.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-accent-blue text-white rounded-lg text-sm font-medium hover:bg-accent-blue/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="w-4 h-4" />
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// HOOK FOR TEXT SELECTION
// ============================================================================

export function useTextSelection(
  containerRef: React.RefObject<HTMLElement>,
  getSectionInfo: (element: Element) => { sectionId: string; sectionTitle: string } | null
) {
  const [selection, setSelection] = useState<TextSelection | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleMouseUp = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !sel.toString().trim()) {
        setSelection(null);
        return;
      }

      const text = sel.toString().trim();
      if (text.length < 3 || text.length > 500) {
        setSelection(null);
        return;
      }

      const range = sel.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      // Find the section this selection belongs to
      let node = range.commonAncestorContainer;
      if (node.nodeType === Node.TEXT_NODE) {
        node = node.parentElement!;
      }

      // Walk up to find section
      let sectionInfo: { sectionId: string; sectionTitle: string } | null = null;
      let element = node as Element;
      while (element && element !== container) {
        sectionInfo = getSectionInfo(element);
        if (sectionInfo) break;
        element = element.parentElement!;
      }

      if (!sectionInfo) {
        setSelection(null);
        return;
      }

      setSelection({
        text,
        startOffset: range.startOffset,
        endOffset: range.endOffset,
        sectionId: sectionInfo.sectionId,
        sectionTitle: sectionInfo.sectionTitle,
        rect,
      });
    };

    const handleMouseDown = (e: MouseEvent) => {
      // Don't clear if clicking on the popover
      const target = e.target as Element;
      if (target.closest('[data-selection-popover]')) return;
      
      setSelection(null);
    };

    container.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mousedown', handleMouseDown);

    return () => {
      container.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, [containerRef, getSectionInfo]);

  const clearSelection = useCallback(() => {
    setSelection(null);
    window.getSelection()?.removeAllRanges();
  }, []);

  return { selection, clearSelection };
}
