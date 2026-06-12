

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  X, ChevronLeft, ChevronRight, ChevronDown, ChevronUp,
  BookOpen, FileText, MessageSquare, Bookmark, BookmarkCheck,
  Search, ZoomIn, ZoomOut, Maximize2, Minimize2,
  Highlighter, MessageCircle, HelpCircle, AlertTriangle, Lightbulb,
  Check, MoreVertical, ExternalLink, Copy, Printer,
  PanelLeftClose, PanelLeftOpen, Eye, EyeOff,
  ArrowUp, ArrowDown, Settings, List, Hash, Type, AlignLeft,
  ChevronsUpDown, Filter, Clock, User, CheckCircle2, XCircle,
  CornerDownRight, Send, Trash2, Edit3, GitCompare
} from 'lucide-react';
import {
  useDocumentViewerStore,
  ViewerDocument,
  ViewerSection,
  Annotation,
  SidebarTab
} from '@/store/useDocumentViewerStore';
import { DocumentModeToggle, DocumentViewMode } from './DocumentModeToggle';
import { PagedDocumentRenderer, PagedDocument, PagedSection } from './PagedDocumentRenderer';

// Convert ViewerDocument to PagedDocument
function viewerToPagedDocument(doc: ViewerDocument): PagedDocument {
  const convertSection = (section: ViewerSection): PagedSection => ({
    id: section.id,
    number: section.number,
    title: section.title,
    level: section.level,
    content: section.content,
    wordCount: section.wordCount,
    subsections: section.subsections?.map(convertSection),
  });

  return {
    id: doc.id,
    title: doc.title,
    shortTitle: doc.shortTitle,
    documentType: doc.documentType,
    version: doc.version,
    status: doc.status,
    author: doc.author,
    lastModified: doc.lastModified,
    sections: doc.sections.map(convertSection),
    productName: doc.productName,
    studyName: doc.studyName,
    ctdSection: doc.ctdSection,
    wordCount: doc.wordCount,
    pageCount: doc.pageCount,
  };
}

// ============================================================================
// PROPS
// ============================================================================

interface DocumentViewerProps {
  document: ViewerDocument;
  onClose: () => void;
  onEdit?: (sectionId: string) => void;
  readOnly?: boolean;
}

// ============================================================================
// ANNOTATION COLORS
// ============================================================================

const ANNOTATION_COLORS = {
  yellow: { bg: 'bg-yellow-500/30', border: 'border-yellow-500/50', text: 'text-yellow-400' },
  green: { bg: 'bg-green-500/30', border: 'border-green-500/50', text: 'text-green-400' },
  blue: { bg: 'bg-blue-500/30', border: 'border-blue-500/50', text: 'text-blue-400' },
  pink: { bg: 'bg-pink-500/30', border: 'border-pink-500/50', text: 'text-pink-400' },
  orange: { bg: 'bg-orange-500/30', border: 'border-orange-500/50', text: 'text-orange-400' },
};

const ANNOTATION_TYPES = [
  { type: 'highlight' as const, icon: Highlighter, label: 'Highlight', color: 'yellow' as const },
  { type: 'comment' as const, icon: MessageCircle, label: 'Comment', color: 'blue' as const },
  { type: 'question' as const, icon: HelpCircle, label: 'Question', color: 'green' as const },
  { type: 'issue' as const, icon: AlertTriangle, label: 'Issue', color: 'pink' as const },
  { type: 'suggestion' as const, icon: Lightbulb, label: 'Suggestion', color: 'orange' as const },
];

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

// Outline/TOC item
function OutlineItem({
  section,
  depth = 0,
  currentSectionId,
  expandedSections,
  onNavigate,
  onToggleExpand,
}: {
  section: ViewerSection;
  depth?: number;
  currentSectionId: string | null;
  expandedSections: Set<string>;
  onNavigate: (id: string) => void;
  onToggleExpand: (id: string) => void;
}) {
  const hasChildren = section.subsections && section.subsections.length > 0;
  const isExpanded = expandedSections.has(section.id);
  const isActive = currentSectionId === section.id;

  return (
    <div>
      <button
        onClick={() => onNavigate(section.id)}
        className={`w-full flex items-center gap-2 px-3 py-2 text-left rounded-lg transition-colors ${
          isActive
            ? 'bg-accent-blue/20 text-accent-blue'
            : 'text-text-secondary hover:bg-surface-card hover:text-text-primary'
        }`}
        style={{ paddingLeft: `${12 + depth * 16}px` }}
      >
        {hasChildren && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand(section.id);
            }}
            className="p-0.5 hover:bg-surface rounded"
          >
            {isExpanded ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )}
          </button>
        )}
        {!hasChildren && <div className="w-4" />}
        <span className="text-xs font-medium text-text-muted w-8">{section.number}</span>
        <span className="text-sm truncate flex-1">{section.title}</span>
      </button>
      {hasChildren && isExpanded && (
        <div>
          {section.subsections!.map((sub) => (
            <OutlineItem
              key={sub.id}
              section={sub}
              depth={depth + 1}
              currentSectionId={currentSectionId}
              expandedSections={expandedSections}
              onNavigate={onNavigate}
              onToggleExpand={onToggleExpand}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Annotation card
function AnnotationCard({
  annotation,
  isActive,
  onClick,
  onResolve,
  onDelete,
  onAddReply,
}: {
  annotation: Annotation;
  isActive: boolean;
  onClick: () => void;
  onResolve: () => void;
  onDelete: () => void;
  onAddReply: (content: string) => void;
}) {
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const colors = ANNOTATION_COLORS[annotation.color];
  const typeInfo = ANNOTATION_TYPES.find((t) => t.type === annotation.type);
  const Icon = typeInfo?.icon || MessageCircle;

  const handleSubmitReply = () => {
    if (replyContent.trim()) {
      onAddReply(replyContent);
      setReplyContent('');
      setShowReplyInput(false);
    }
  };

  return (
    <div
      onClick={onClick}
      className={`p-3 rounded-lg border cursor-pointer transition-all ${
        isActive ? `${colors?.bg ?? ''} ${colors?.border ?? ''}` : 'bg-surface-card border-border hover:border-border-hover'
      }`}
    >
      <div className="flex items-start gap-2">
        <Icon className={`w-4 h-4 mt-0.5 ${colors?.text ?? ''}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-text-primary">{annotation.createdByName}</span>
            <span className="text-xs text-text-muted">
              {new Date(annotation.createdAt).toLocaleDateString()}
            </span>
            {annotation.status === 'resolved' && (
              <span className="text-xs px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded">Resolved</span>
            )}
          </div>
          {annotation.selectedText && (
            <p className={`text-xs ${colors?.bg ?? ''} px-2 py-1 rounded mb-2 italic`}>
              "{annotation.selectedText.substring(0, 100)}
              {annotation.selectedText.length > 100 ? '...' : ''}"
            </p>
          )}
          {annotation.content && (
            <p className="text-sm text-text-secondary">{annotation.content}</p>
          )}

          {/* Replies */}
          {annotation.replies.length > 0 && (
            <div className="mt-3 space-y-2 pl-3 border-l-2 border-border">
              {annotation.replies.map((reply) => (
                <div key={reply.id} className="text-xs">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-medium text-text-primary">{reply.createdByName}</span>
                    <span className="text-text-muted">
                      {new Date(reply.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-text-secondary">{reply.content}</p>
                </div>
              ))}
            </div>
          )}

          {/* Reply input */}
          {showReplyInput && (
            <div className="mt-2 flex gap-2">
              <input
                type="text"
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmitReply()}
                placeholder="Type a reply..."
                className="flex-1 px-2 py-1 text-xs bg-surface border border-border rounded focus:outline-none focus:border-accent-blue"
                autoFocus
              />
              <button
                onClick={handleSubmitReply}
                className="p-1 text-accent-blue hover:bg-accent-blue/10 rounded"
              >
                <Send className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Actions */}
          <div className="mt-2 flex items-center gap-2">
            {annotation.status === 'open' && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowReplyInput(!showReplyInput);
                  }}
                  className="text-xs text-text-muted hover:text-text-primary flex items-center gap-1"
                >
                  <CornerDownRight className="w-3 h-3" /> Reply
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onResolve();
                  }}
                  className="text-xs text-green-400 hover:text-green-300 flex items-center gap-1"
                >
                  <Check className="w-3 h-3" /> Resolve
                </button>
              </>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 ml-auto"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Selection popup for creating annotations
function SelectionPopup({
  position,
  onAnnotate,
  onClose,
}: {
  position: { x: number; y: number };
  onAnnotate: (type: Annotation['type'], color: Annotation['color']) => void;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed z-50 bg-surface-elevated border border-border rounded-lg shadow-xl p-2 flex gap-1"
      style={{ left: position.x, top: position.y - 50 }}
    >
      {ANNOTATION_TYPES.map(({ type, icon: Icon, label, color }) => (
        <button
          key={type}
          onClick={() => onAnnotate(type, color)}
          className={`p-2 rounded-lg hover:bg-surface-card transition-colors ${ANNOTATION_COLORS[color].text}`}
          title={label}
        >
          <Icon className="w-4 h-4" />
        </button>
      ))}
      <button
        onClick={onClose}
        className="p-2 rounded-lg hover:bg-surface-card text-text-muted"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function DocumentViewer({ document, onClose, onEdit, readOnly = false }: DocumentViewerProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [showSelectionPopup, setShowSelectionPopup] = useState(false);
  const [selectionPopupPos, setSelectionPopupPos] = useState({ x: 0, y: 0 });
  const [annotationComment, setAnnotationComment] = useState('');
  const [showAnnotationDialog, setShowAnnotationDialog] = useState(false);
  const [pendingAnnotation, setPendingAnnotation] = useState<{
    type: Annotation['type'];
    color: Annotation['color'];
  } | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // State selectors - use individual selectors to prevent infinite loops
  const currentDocument = useDocumentViewerStore(s => s.currentDocument);
  const viewMode = useDocumentViewerStore(s => s.viewMode);
  const documentRenderMode = useDocumentViewerStore(s => s.documentRenderMode);
  const sidebarTab = useDocumentViewerStore(s => s.sidebarTab);
  const showSidebar = useDocumentViewerStore(s => s.showSidebar);
  const showAnnotations = useDocumentViewerStore(s => s.showAnnotations);
  const fontSize = useDocumentViewerStore(s => s.fontSize);
  const lineSpacing = useDocumentViewerStore(s => s.lineSpacing);
  const currentSectionId = useDocumentViewerStore(s => s.currentSectionId);
  const expandedSections = useDocumentViewerStore(s => s.expandedSections);
  const selectedText = useDocumentViewerStore(s => s.selectedText);
  const selectionRange = useDocumentViewerStore(s => s.selectionRange);
  const activeAnnotationId = useDocumentViewerStore(s => s.activeAnnotationId);
  const annotationFilter = useDocumentViewerStore(s => s.annotationFilter);
  const searchQuery = useDocumentViewerStore(s => s.searchQuery);
  const searchResults = useDocumentViewerStore(s => s.searchResults);
  const currentSearchIndex = useDocumentViewerStore(s => s.currentSearchIndex);
  const bookmarks = useDocumentViewerStore(s => s.bookmarks);
  
  // Action selectors - stable references
  const openDocument = useDocumentViewerStore(s => s.openDocument);
  const closeDocument = useDocumentViewerStore(s => s.closeDocument);
  const setViewMode = useDocumentViewerStore(s => s.setViewMode);
  const setDocumentRenderMode = useDocumentViewerStore(s => s.setDocumentRenderMode);
  const setSidebarTab = useDocumentViewerStore(s => s.setSidebarTab);
  const toggleSidebar = useDocumentViewerStore(s => s.toggleSidebar);
  const toggleAnnotations = useDocumentViewerStore(s => s.toggleAnnotations);
  const setFontSize = useDocumentViewerStore(s => s.setFontSize);
  const setLineSpacing = useDocumentViewerStore(s => s.setLineSpacing);
  const navigateToSection = useDocumentViewerStore(s => s.navigateToSection);
  const toggleSectionExpanded = useDocumentViewerStore(s => s.toggleSectionExpanded);
  const expandAllSections = useDocumentViewerStore(s => s.expandAllSections);
  const collapseAllSections = useDocumentViewerStore(s => s.collapseAllSections);
  const setSelection = useDocumentViewerStore(s => s.setSelection);
  const clearSelection = useDocumentViewerStore(s => s.clearSelection);
  const addAnnotation = useDocumentViewerStore(s => s.addAnnotation);
  const deleteAnnotation = useDocumentViewerStore(s => s.deleteAnnotation);
  const resolveAnnotation = useDocumentViewerStore(s => s.resolveAnnotation);
  const addAnnotationReply = useDocumentViewerStore(s => s.addAnnotationReply);
  const setActiveAnnotation = useDocumentViewerStore(s => s.setActiveAnnotation);
  const setAnnotationFilter = useDocumentViewerStore(s => s.setAnnotationFilter);
  const getDocumentAnnotations = useDocumentViewerStore(s => s.getDocumentAnnotations);
  const getSectionAnnotations = useDocumentViewerStore(s => s.getSectionAnnotations);
  const addBookmark = useDocumentViewerStore(s => s.addBookmark);
  const removeBookmark = useDocumentViewerStore(s => s.removeBookmark);
  const getDocumentBookmarks = useDocumentViewerStore(s => s.getDocumentBookmarks);
  const setSearchQuery = useDocumentViewerStore(s => s.setSearchQuery);
  const navigateSearchResult = useDocumentViewerStore(s => s.navigateSearchResult);
  const clearSearch = useDocumentViewerStore(s => s.clearSearch);

  // Open document on mount
  useEffect(() => {
    openDocument(document);
    return () => closeDocument();
  }, [document, openDocument, closeDocument]);

  // Get current data
  const annotations = useMemo(() => getDocumentAnnotations(document.id), [document.id, getDocumentAnnotations, annotationFilter]);
  const docBookmarks = useMemo(() => getDocumentBookmarks(document.id), [document.id, getDocumentBookmarks]);

  // Handle text selection
  const handleTextSelection = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || readOnly) {
      setShowSelectionPopup(false);
      return;
    }

    const text = selection.toString().trim();
    if (text.length < 3) {
      setShowSelectionPopup(false);
      return;
    }

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    
    // Find the section ID from the selection
    let element = range.startContainer.parentElement;
    let sectionId: string | null = null;
    while (element) {
      if (element.dataset?.sectionId) {
        sectionId = element.dataset.sectionId;
        break;
      }
      element = element.parentElement;
    }

    if (sectionId) {
      setSelection(text, {
        start: range.startOffset,
        end: range.endOffset,
        sectionId,
      });
      setSelectionPopupPos({
        x: rect.left + rect.width / 2 - 100,
        y: rect.top + window.scrollY,
      });
      setShowSelectionPopup(true);
    }
  }, [setSelection, readOnly]);

  // Create annotation from selection
  const handleAnnotate = useCallback((type: Annotation['type'], color: Annotation['color']) => {
    if (!selectedText || !selectionRange) return;

    if (type === 'highlight') {
      // Highlights don't need a comment
      addAnnotation({
        documentId: document.id,
        sectionId: selectionRange.sectionId,
        startOffset: selectionRange.start,
        endOffset: selectionRange.end,
        selectedText,
        type,
        color,
        createdBy: 'current-user',
        createdByName: 'You',
      });
      setShowSelectionPopup(false);
      clearSelection();
    } else {
      // Other types need a comment dialog
      setPendingAnnotation({ type, color });
      setShowAnnotationDialog(true);
      setShowSelectionPopup(false);
    }
  }, [selectedText, selectionRange, document.id, addAnnotation, clearSelection]);

  const handleSubmitAnnotation = useCallback(() => {
    if (!pendingAnnotation || !selectedText || !selectionRange) return;

    addAnnotation({
      documentId: document.id,
      sectionId: selectionRange.sectionId,
      startOffset: selectionRange.start,
      endOffset: selectionRange.end,
      selectedText,
      type: pendingAnnotation.type,
      color: pendingAnnotation.color,
      content: annotationComment,
      createdBy: 'current-user',
      createdByName: 'You',
    });

    setShowAnnotationDialog(false);
    setAnnotationComment('');
    setPendingAnnotation(null);
    clearSelection();
  }, [pendingAnnotation, selectedText, selectionRange, document.id, annotationComment, addAnnotation, clearSelection]);

  // Scroll to section
  const scrollToSection = useCallback((sectionId: string) => {
    const element = contentRef.current?.querySelector(`[data-section-id="${sectionId}"]`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    navigateToSection(sectionId);
  }, [navigateToSection]);

  // Toggle bookmark
  const toggleBookmark = useCallback((sectionId: string, title: string) => {
    const existing = docBookmarks.find((b) => b.sectionId === sectionId);
    if (existing) {
      removeBookmark(document.id, existing.id);
    } else {
      addBookmark({ documentId: document.id, sectionId, title });
    }
  }, [docBookmarks, document.id, addBookmark, removeBookmark]);

  // Font size classes
  const fontSizeClasses = {
    small: 'text-sm',
    medium: 'text-base',
    large: 'text-lg',
  };

  const lineSpacingClasses = {
    compact: 'leading-snug',
    normal: 'leading-relaxed',
    relaxed: 'leading-loose',
  };

  // Render section content with annotations
  const renderSectionContent = (section: ViewerSection) => {
    const sectionAnnotations = getSectionAnnotations(document.id, section.id);
    let content = section.content;

    // For now, just render HTML content
    // In production, you'd parse and highlight annotated regions
    return (
      <div
        data-section-id={section.id}
        className={`prose prose-invert max-w-none ${fontSizeClasses[fontSize]} ${lineSpacingClasses[lineSpacing]}`}
        dangerouslySetInnerHTML={{ __html: content }}
        onMouseUp={handleTextSelection}
      />
    );
  };

  // Render section tree
  const renderSection = (section: ViewerSection, depth = 0) => {
    const isBookmarked = docBookmarks.some((b) => b.sectionId === section.id);
    const sectionAnnotations = getSectionAnnotations(document.id, section.id);
    const hasAnnotations = sectionAnnotations.length > 0;

    return (
      <div key={section.id} className="mb-8" data-section-id={section.id}>
        {/* Section header */}
        <div className="flex items-center gap-3 mb-4 group">
          <h2
            className={`font-semibold text-text-primary ${
              depth === 0 ? 'text-xl' : depth === 1 ? 'text-lg' : 'text-base'
            }`}
          >
            <span className="text-text-muted mr-2">{section.number}</span>
            {section.title}
          </h2>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => toggleBookmark(section.id, `${section.number} ${section.title}`)}
              className={`p-1.5 rounded-lg transition-colors ${
                isBookmarked
                  ? 'text-amber-400 bg-amber-400/10'
                  : 'text-text-muted hover:text-text-primary hover:bg-surface-card'
              }`}
              title={isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
            >
              {isBookmarked ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
            </button>
            {hasAnnotations && showAnnotations && (
              <span className="px-1.5 py-0.5 text-xs bg-blue-500/20 text-blue-400 rounded">
                {sectionAnnotations.length}
              </span>
            )}
            {onEdit && !readOnly && (
              <button
                onClick={() => onEdit(section.id)}
                className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-card"
                title="Edit section"
              >
                <Edit3 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Section content */}
        {renderSectionContent(section)}

        {/* Subsections */}
        {section.subsections?.map((sub) => renderSection(sub, depth + 1))}
      </div>
    );
  };

  return (
    <div className={`fixed inset-0 bg-surface z-50 flex flex-col ${isFullscreen ? '' : ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-surface-elevated border-b border-border">
        <div className="flex items-center gap-4">
          <button
            onClick={onClose}
            className="p-2 hover:bg-surface-card rounded-lg text-text-muted hover:text-text-primary"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-accent-blue" />
            <div>
              <h1 className="font-semibold text-text-primary">{document.title}</h1>
              <div className="flex items-center gap-2 text-xs text-text-muted">
                <span>v{document.version}</span>
                <span>•</span>
                <span>{document.wordCount.toLocaleString()} words</span>
                <span>•</span>
                <span>{document.status}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="pl-9 pr-3 py-1.5 w-48 text-sm bg-surface-card border border-border rounded-lg focus:outline-none focus:border-accent-blue"
            />
            {searchResults.length > 0 && (
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 text-xs text-text-muted">
                <span>{currentSearchIndex + 1}/{searchResults.length}</span>
                <button onClick={() => navigateSearchResult('prev')} className="p-0.5 hover:text-text-primary">
                  <ArrowUp className="w-3 h-3" />
                </button>
                <button onClick={() => navigateSearchResult('next')} className="p-0.5 hover:text-text-primary">
                  <ArrowDown className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          {/* View controls */}
          <div className="flex items-center gap-1 px-2 border-l border-border">
            <button
              onClick={() => setFontSize(fontSize === 'small' ? 'medium' : fontSize === 'medium' ? 'large' : 'small')}
              className="p-2 hover:bg-surface-card rounded-lg text-text-muted hover:text-text-primary"
              title="Font size"
            >
              <Type className="w-4 h-4" />
            </button>
            <button
              onClick={() => toggleAnnotations()}
              className={`p-2 rounded-lg ${showAnnotations ? 'text-accent-blue bg-accent-blue/10' : 'text-text-muted hover:text-text-primary hover:bg-surface-card'}`}
              title={showAnnotations ? 'Hide annotations' : 'Show annotations'}
            >
              {showAnnotations ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 hover:bg-surface-card rounded-lg text-text-muted hover:text-text-primary"
              title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
          
          {/* Document Render Mode Toggle */}
          <div className="border-l border-border pl-2 ml-1">
            <DocumentModeToggle
              currentMode={documentRenderMode}
              onChange={setDocumentRenderMode}
              compact
            />
          </div>

          {/* Sidebar toggle */}
          <button
            onClick={toggleSidebar}
            className="p-2 hover:bg-surface-card rounded-lg text-text-muted hover:text-text-primary"
          >
            {showSidebar ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        {showSidebar && (
          <div className="w-80 border-r border-border bg-surface-elevated flex flex-col">
            {/* Sidebar tabs */}
            <div className="flex border-b border-border">
              {[
                { id: 'outline' as SidebarTab, icon: List, label: 'Outline' },
                { id: 'annotations' as SidebarTab, icon: MessageSquare, label: 'Annotations' },
                { id: 'bookmarks' as SidebarTab, icon: Bookmark, label: 'Bookmarks' },
                { id: 'search' as SidebarTab, icon: Search, label: 'Search' },
              ].map(({ id, icon: Icon, label }) => (
                <button
                  key={id}
                  onClick={() => setSidebarTab(id)}
                  className={`flex-1 py-3 text-xs flex flex-col items-center gap-1 transition-colors ${
                    sidebarTab === id
                      ? 'text-accent-blue border-b-2 border-accent-blue bg-accent-blue/5'
                      : 'text-text-muted hover:text-text-primary'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>

            {/* Sidebar content */}
            <div className="flex-1 overflow-auto p-3">
              {sidebarTab === 'outline' && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-medium text-text-muted uppercase">Contents</span>
                    <div className="flex gap-1">
                      <button
                        onClick={expandAllSections}
                        className="p-1 text-text-muted hover:text-text-primary"
                        title="Expand all"
                      >
                        <ChevronsUpDown className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  {document.sections.map((section) => (
                    <OutlineItem
                      key={section.id}
                      section={section}
                      currentSectionId={currentSectionId}
                      expandedSections={expandedSections}
                      onNavigate={scrollToSection}
                      onToggleExpand={toggleSectionExpanded}
                    />
                  ))}
                </div>
              )}

              {sidebarTab === 'annotations' && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 mb-3">
                    <select
                      value={annotationFilter}
                      onChange={(e) => setAnnotationFilter(e.target.value as typeof annotationFilter)}
                      className="flex-1 px-2 py-1 text-xs bg-surface-card border border-border rounded-lg"
                    >
                      <option value="all">All ({getDocumentAnnotations(document.id).length})</option>
                      <option value="open">Open</option>
                      <option value="resolved">Resolved</option>
                      <option value="comment">Comments</option>
                      <option value="question">Questions</option>
                      <option value="issue">Issues</option>
                    </select>
                  </div>
                  {annotations.length === 0 ? (
                    <div className="text-center py-8 text-text-muted">
                      <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No annotations yet</p>
                      <p className="text-xs mt-1">Select text to add annotations</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {annotations.map((annotation) => (
                        <AnnotationCard
                          key={annotation.id}
                          annotation={annotation}
                          isActive={activeAnnotationId === annotation.id}
                          onClick={() => {
                            setActiveAnnotation(annotation.id);
                            scrollToSection(annotation.sectionId);
                          }}
                          onResolve={() => resolveAnnotation(document.id, annotation.id, 'You')}
                          onDelete={() => deleteAnnotation(document.id, annotation.id)}
                          onAddReply={(content) =>
                            addAnnotationReply(document.id, annotation.id, {
                              content,
                              createdBy: 'current-user',
                              createdByName: 'You',
                            })
                          }
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {sidebarTab === 'bookmarks' && (
                <div className="space-y-2">
                  {docBookmarks.length === 0 ? (
                    <div className="text-center py-8 text-text-muted">
                      <Bookmark className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No bookmarks yet</p>
                      <p className="text-xs mt-1">Click the bookmark icon on sections</p>
                    </div>
                  ) : (
                    docBookmarks.map((bookmark) => (
                      <button
                        key={bookmark.id}
                        onClick={() => scrollToSection(bookmark.sectionId)}
                        className="w-full p-3 text-left bg-surface-card border border-border rounded-lg hover:border-accent-blue/50 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <Bookmark className="w-4 h-4 text-amber-400" />
                          <span className="text-sm text-text-primary truncate">{bookmark.title}</span>
                        </div>
                        <p className="text-xs text-text-muted mt-1">
                          {new Date(bookmark.createdAt).toLocaleDateString()}
                        </p>
                      </button>
                    ))
                  )}
                </div>
              )}

              {sidebarTab === 'search' && (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search document..."
                    className="w-full px-3 py-2 text-sm bg-surface-card border border-border rounded-lg focus:outline-none focus:border-accent-blue"
                    autoFocus
                  />
                  {searchResults.length > 0 && (
                    <div className="text-xs text-text-muted mb-2">
                      {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
                    </div>
                  )}
                  <div className="space-y-2">
                    {searchResults.map((result, idx) => (
                      <button
                        key={`${result.sectionId}-${idx}`}
                        onClick={() => {
                          scrollToSection(result.sectionId);
                        }}
                        className={`w-full p-3 text-left rounded-lg border transition-colors ${
                          idx === currentSearchIndex
                            ? 'bg-accent-blue/10 border-accent-blue/50'
                            : 'bg-surface-card border-border hover:border-accent-blue/30'
                        }`}
                      >
                        <div className="text-xs text-text-muted mb-1">{result.sectionTitle}</div>
                        <p className="text-sm text-text-secondary">{result.context}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Document content */}
        {documentRenderMode === 'document' ? (
          // Document Mode: Page-faithful rendering
          <div className="flex-1 overflow-hidden">
            <PagedDocumentRenderer
              document={viewerToPagedDocument(document)}
              onClose={() => setDocumentRenderMode('draft')}
              onEdit={onEdit}
              readOnly={readOnly}
              showToolbar={false}
            />
          </div>
        ) : (
          // Draft Mode: Original dark theme viewer
          <div className="flex-1 overflow-auto bg-surface" ref={contentRef}>
            <div className="max-w-4xl mx-auto px-8 py-12">
              {/* Document header */}
              <div className="mb-12 pb-8 border-b border-border">
                <div className="flex items-center gap-2 text-sm text-text-muted mb-4">
                  {document.ctdSection && (
                    <span className="px-2 py-0.5 bg-surface-card rounded">CTD {document.ctdSection}</span>
                  )}
                  <span>{document.documentType}</span>
                </div>
                <h1 className="text-3xl font-bold text-text-primary mb-4">{document.title}</h1>
                <div className="flex flex-wrap items-center gap-4 text-sm text-text-muted">
                  <span className="flex items-center gap-1">
                    <User className="w-4 h-4" /> {document.author}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" /> {new Date(document.lastModified).toLocaleDateString()}
                  </span>
                  <span>Version {document.version}</span>
                  {document.productName && <span>• {document.productName}</span>}
                </div>
              </div>

              {/* Sections */}
              {document.sections.map((section) => renderSection(section))}
            </div>
          </div>
        )}
      </div>

      {/* Selection popup */}
      {showSelectionPopup && !readOnly && (
        <SelectionPopup
          position={selectionPopupPos}
          onAnnotate={handleAnnotate}
          onClose={() => {
            setShowSelectionPopup(false);
            clearSelection();
          }}
        />
      )}

      {/* Annotation dialog */}
      {showAnnotationDialog && pendingAnnotation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-surface-elevated border border-border rounded-xl p-6 w-[400px]">
            <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
              {(() => {
                const info = ANNOTATION_TYPES.find((t) => t.type === pendingAnnotation.type);
                const Icon = info?.icon || MessageCircle;
                return <Icon className={`w-5 h-5 ${ANNOTATION_COLORS[pendingAnnotation.color].text}`} />;
              })()}
              Add {pendingAnnotation.type.charAt(0).toUpperCase() + pendingAnnotation.type.slice(1)}
            </h3>
            {selectedText && (
              <div className={`p-3 rounded-lg mb-4 text-sm italic ${ANNOTATION_COLORS[pendingAnnotation.color]?.bg}`}>
                "{selectedText.substring(0, 150)}{selectedText.length > 150 ? '...' : ''}"
              </div>
            )}
            <textarea
              value={annotationComment}
              onChange={(e) => setAnnotationComment(e.target.value)}
              placeholder="Add your comment..."
              className="w-full h-32 px-3 py-2 text-sm bg-surface-card border border-border rounded-lg focus:outline-none focus:border-accent-blue resize-none"
              autoFocus
            />
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => {
                  setShowAnnotationDialog(false);
                  setPendingAnnotation(null);
                  setAnnotationComment('');
                  clearSelection();
                }}
                className="px-4 py-2 text-sm text-text-muted hover:text-text-primary"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitAnnotation}
                disabled={!annotationComment.trim()}
                className="px-4 py-2 text-sm bg-accent-blue text-white rounded-lg hover:bg-accent-blue/90 disabled:opacity-50"
              >
                Add Annotation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
