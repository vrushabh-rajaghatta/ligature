// =============================================================================
// RESIZABLE DOCUMENT VIEWER - v0.39.2
// =============================================================================
// Enhanced document viewer with resizable sidebar and annotation panels.
// Supports horizontal resize for sidebar and vertical resize for bottom panel.
// =============================================================================


import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  X,
  FileText,
  Search,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Eye,
  EyeOff,
  Type,
  List,
  MessageSquare,
  Bookmark,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  Highlighter,
  MessageCircle,
  AlertTriangle,
  Lightbulb,
  HelpCircle,
  GripVertical,
  Edit3,
  Clock,
  User,
  Check,
  Send,
} from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

type SidebarTab = 'outline' | 'annotations' | 'bookmarks' | 'search';
type FontSize = 'small' | 'medium' | 'large';

interface ViewerDocument {
  id: string;
  title: string;
  version: string;
  status: string;
  wordCount: number;
  pageCount: number;
  author: string;
  lastModified: string;
  sections: ViewerSection[];
}

interface ViewerSection {
  id: string;
  number: string;
  title: string;
  level: number;
  content: string;
  wordCount: number;
  subsections?: ViewerSection[];
}

interface Annotation {
  id: string;
  sectionId: string;
  type: 'highlight' | 'comment' | 'question' | 'issue' | 'suggestion';
  content: string;
  selectedText?: string;
  author: string;
  createdAt: string;
  resolved: boolean;
}

// =============================================================================
// RESIZE HOOK
// =============================================================================

interface UseResizeOptions {
  initialSize: number;
  minSize: number;
  maxSize: number;
  direction: 'horizontal' | 'vertical';
  storageKey?: string;
}

function useResize({
  initialSize,
  minSize,
  maxSize,
  direction,
  storageKey,
}: UseResizeOptions) {
  const [size, setSize] = useState(() => {
    if (storageKey && typeof window !== 'undefined') {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = parseInt(stored, 10);
        if (!isNaN(parsed)) {
          return Math.min(maxSize, Math.max(minSize, parsed));
        }
      }
    }
    return initialSize;
  });

  const [isResizing, setIsResizing] = useState(false);
  const startPosRef = useRef(0);
  const startSizeRef = useRef(0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    startPosRef.current = direction === 'horizontal' ? e.clientX : e.clientY;
    startSizeRef.current = size;
  }, [size, direction]);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const currentPos = direction === 'horizontal' ? e.clientX : e.clientY;
      const delta = currentPos - startPosRef.current;
      const newSize = Math.min(maxSize, Math.max(minSize, startSizeRef.current + delta));
      setSize(newSize);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      if (storageKey) {
        localStorage.setItem(storageKey, size.toString());
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.userSelect = 'none';
    document.body.style.cursor = direction === 'horizontal' ? 'col-resize' : 'row-resize';

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [isResizing, minSize, maxSize, direction, storageKey, size]);

  return { size, setSize, isResizing, handleMouseDown };
}

// =============================================================================
// RESIZE HANDLE COMPONENT
// =============================================================================

interface ResizeHandleProps {
  direction: 'horizontal' | 'vertical';
  onMouseDown: (e: React.MouseEvent) => void;
  isResizing: boolean;
}

function ResizeHandle({ direction, onMouseDown, isResizing }: ResizeHandleProps) {
  const isHorizontal = direction === 'horizontal';

  return (
    <div
      onMouseDown={onMouseDown}
      className={`
        relative group flex-shrink-0 flex items-center justify-center
        ${isHorizontal ? 'w-1.5 cursor-col-resize' : 'h-1.5 cursor-row-resize'}
        ${isResizing ? 'bg-accent-blue/30' : 'hover:bg-accent-blue/20'}
        transition-colors
      `}
      role="separator"
      aria-orientation={isHorizontal ? 'vertical' : 'horizontal'}
      aria-label="Resize handle"
    >
      {/* Visible indicator */}
      <div
        className={`
          absolute transition-all duration-150
          ${isHorizontal
            ? 'inset-y-0 w-0.5 left-1/2 -translate-x-1/2'
            : 'inset-x-0 h-0.5 top-1/2 -translate-y-1/2'
          }
          ${isResizing ? 'bg-accent-blue' : 'bg-border group-hover:bg-accent-blue/50'}
        `}
      />

      {/* Extended hit area */}
      <div
        className={`
          absolute
          ${isHorizontal ? 'inset-y-0 w-3 -left-0.5' : 'inset-x-0 h-3 -top-0.5'}
        `}
      />
    </div>
  );
}

// =============================================================================
// MOCK DATA
// =============================================================================

const MOCK_DOCUMENT: ViewerDocument = {
  id: 'doc-co-001',
  title: 'Clinical Overview - Ligrastinib 50mg Tablets',
  version: '2.3',
  status: 'In Review',
  wordCount: 35000,
  pageCount: 85,
  author: 'Dr. Emily Watson',
  lastModified: '2025-01-28',
  sections: [
    {
      id: 's1',
      number: '2.5.1',
      title: 'Product Development Rationale',
      level: 1,
      content: 'Ligrastinib represents a novel approach to treating advanced solid tumors through selective inhibition of the LIG-kinase pathway...',
      wordCount: 3500,
      subsections: [
        {
          id: 's1-1',
          number: '2.5.1.1',
          title: 'Mechanism of Action',
          level: 2,
          content: 'The mechanism of action involves...',
          wordCount: 1200,
        },
        {
          id: 's1-2',
          number: '2.5.1.2',
          title: 'Pharmacological Class',
          level: 2,
          content: 'Ligrastinib belongs to the class of...',
          wordCount: 800,
        },
      ],
    },
    {
      id: 's2',
      number: '2.5.2',
      title: 'Overview of Clinical Development Program',
      level: 1,
      content: 'The clinical development program consisted of Phase 1 dose-escalation studies...',
      wordCount: 5000,
    },
    {
      id: 's3',
      number: '2.5.3',
      title: 'Overview of Efficacy',
      level: 1,
      content: 'The efficacy of Ligrastinib was established in two pivotal Phase 3 studies...',
      wordCount: 8000,
    },
    {
      id: 's4',
      number: '2.5.4',
      title: 'Overview of Safety',
      level: 1,
      content: 'The safety profile of Ligrastinib is consistent with its mechanism of action...',
      wordCount: 7000,
    },
    {
      id: 's5',
      number: '2.5.5',
      title: 'Benefits and Risks Conclusions',
      level: 1,
      content: 'The benefit-risk assessment demonstrates that Ligrastinib provides meaningful clinical benefit...',
      wordCount: 3500,
    },
  ],
};

const MOCK_ANNOTATIONS: Annotation[] = [
  {
    id: 'ann-1',
    sectionId: 's1',
    type: 'comment',
    content: 'Consider adding recent competitive landscape analysis',
    selectedText: 'novel approach',
    author: 'Sarah Chen',
    createdAt: '2025-01-27T10:30:00Z',
    resolved: false,
  },
  {
    id: 'ann-2',
    sectionId: 's3',
    type: 'question',
    content: 'Should we include the subgroup analysis here?',
    author: 'Michael Roberts',
    createdAt: '2025-01-26T14:15:00Z',
    resolved: false,
  },
  {
    id: 'ann-3',
    sectionId: 's4',
    type: 'issue',
    content: 'Need to update AE tables with latest data cut',
    author: 'Dr. James Park',
    createdAt: '2025-01-25T09:00:00Z',
    resolved: true,
  },
];

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

function OutlineItem({
  section,
  depth = 0,
  currentSectionId,
  expandedSections,
  onNavigate,
  onToggle,
}: {
  section: ViewerSection;
  depth?: number;
  currentSectionId: string | null;
  expandedSections: Set<string>;
  onNavigate: (id: string) => void;
  onToggle: (id: string) => void;
}) {
  const hasChildren = section.subsections && section.subsections.length > 0;
  const isExpanded = expandedSections.has(section.id);
  const isActive = currentSectionId === section.id;

  return (
    <div>
      <button
        onClick={() => onNavigate(section.id)}
        className={`w-full text-left px-2 py-1.5 rounded flex items-center gap-1 text-sm transition-colors ${
          isActive
            ? 'bg-accent-blue/10 text-accent-blue'
            : 'text-text-secondary hover:bg-surface-card hover:text-text-primary'
        }`}
        style={{ paddingLeft: `${8 + depth * 12}px` }}
      >
        {hasChildren && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggle(section.id);
            }}
            className="p-0.5"
          >
            {isExpanded ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )}
          </button>
        )}
        {!hasChildren && <span className="w-4" />}
        <span className="text-text-muted font-mono text-xs mr-1">{section.number}</span>
        <span className="truncate">{section.title}</span>
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
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
}

const ANNOTATION_CONFIG = {
  highlight: { icon: Highlighter, color: 'text-yellow-400 bg-yellow-500/20' },
  comment: { icon: MessageCircle, color: 'text-blue-400 bg-blue-500/20' },
  question: { icon: HelpCircle, color: 'text-green-400 bg-green-500/20' },
  issue: { icon: AlertTriangle, color: 'text-pink-400 bg-pink-500/20' },
  suggestion: { icon: Lightbulb, color: 'text-orange-400 bg-orange-500/20' },
};

function AnnotationCard({
  annotation,
  isActive,
  onClick,
  onResolve,
}: {
  annotation: Annotation;
  isActive: boolean;
  onClick: () => void;
  onResolve: () => void;
}) {
  const config = ANNOTATION_CONFIG[annotation.type];
  const Icon = config.icon;

  return (
    <div
      onClick={onClick}
      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
        isActive
          ? 'border-accent-blue bg-accent-blue/5'
          : 'border-border hover:border-border/80 bg-surface-card'
      } ${annotation.resolved ? 'opacity-60' : ''}`}
    >
      <div className="flex items-start gap-2">
        <div className={`p-1 rounded ${config?.color ?? ''}`}>
          <Icon className="w-3 h-3" />
        </div>
        <div className="flex-1 min-w-0">
          {annotation.selectedText && (
            <p className="text-xs text-text-muted italic mb-1 truncate">
              "{annotation.selectedText}"
            </p>
          )}
          <p className="text-sm text-text-primary">{annotation.content}</p>
          <div className="flex items-center gap-2 mt-2 text-xs text-text-muted">
            <User className="w-3 h-3" />
            <span>{annotation.author}</span>
            <span>•</span>
            <Clock className="w-3 h-3" />
            <span>{new Date(annotation.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
        {!annotation.resolved && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onResolve();
            }}
            className="p-1 hover:bg-surface-elevated rounded text-text-muted hover:text-green-400"
            title="Mark as resolved"
          >
            <Check className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

interface ResizableDocumentViewerProps {
  document?: ViewerDocument;
  onClose: () => void;
  onEdit?: (sectionId: string) => void;
  readOnly?: boolean;
}

export function ResizableDocumentViewer({
  document = MOCK_DOCUMENT,
  onClose,
  onEdit,
  readOnly = false,
}: ResizableDocumentViewerProps) {
  // Panel states
  const [showLeftSidebar, setShowLeftSidebar] = useState(true);
  const [showRightPanel, setShowRightPanel] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('outline');
  
  // Document states
  const [currentSectionId, setCurrentSectionId] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['s1']));
  const [annotations] = useState(MOCK_ANNOTATIONS);
  const [activeAnnotationId, setActiveAnnotationId] = useState<string | null>(null);
  
  // View states
  const [fontSize, setFontSize] = useState<FontSize>('medium');
  const [showAnnotations, setShowAnnotations] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Resize hooks
  const leftSidebarResize = useResize({
    initialSize: 280,
    minSize: 200,
    maxSize: 450,
    direction: 'horizontal',
    storageKey: 'viewer-left-sidebar',
  });

  const rightPanelResize = useResize({
    initialSize: 320,
    minSize: 240,
    maxSize: 500,
    direction: 'horizontal',
    storageKey: 'viewer-right-panel',
  });

  const handleNavigate = (sectionId: string) => {
    setCurrentSectionId(sectionId);
    // In real implementation, scroll to section
  };

  const handleToggleSection = (sectionId: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  const fontSizeClasses = {
    small: 'text-sm leading-relaxed',
    medium: 'text-base leading-relaxed',
    large: 'text-lg leading-loose',
  };

  return (
    <div className={`fixed inset-0 bg-surface z-50 flex flex-col`}>
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
          </div>

          {/* View controls */}
          <div className="flex items-center gap-1 px-2 border-l border-border">
            <button
              onClick={() =>
                setFontSize((prev) =>
                  prev === 'small' ? 'medium' : prev === 'medium' ? 'large' : 'small'
                )
              }
              className="p-2 hover:bg-surface-card rounded-lg text-text-muted hover:text-text-primary"
              title="Font size"
            >
              <Type className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowAnnotations(!showAnnotations)}
              className={`p-2 rounded-lg ${
                showAnnotations
                  ? 'text-accent-blue bg-accent-blue/10'
                  : 'text-text-muted hover:text-text-primary hover:bg-surface-card'
              }`}
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

          {/* Panel toggles */}
          <div className="flex items-center gap-1 px-2 border-l border-border">
            <button
              onClick={() => setShowLeftSidebar(!showLeftSidebar)}
              className={`p-2 rounded-lg ${
                showLeftSidebar
                  ? 'text-accent-blue bg-accent-blue/10'
                  : 'text-text-muted hover:text-text-primary hover:bg-surface-card'
              }`}
              title={showLeftSidebar ? 'Hide sidebar' : 'Show sidebar'}
            >
              {showLeftSidebar ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setShowRightPanel(!showRightPanel)}
              className={`p-2 rounded-lg ${
                showRightPanel
                  ? 'text-accent-blue bg-accent-blue/10'
                  : 'text-text-muted hover:text-text-primary hover:bg-surface-card'
              }`}
              title={showRightPanel ? 'Hide comments' : 'Show comments'}
            >
              {showRightPanel ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Main content area with resizable panels */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Resizable */}
        {showLeftSidebar && (
          <>
            <div
              className="flex-shrink-0 bg-surface-elevated border-r border-border flex flex-col overflow-hidden"
              style={{ width: leftSidebarResize.size }}
            >
              {/* Sidebar tabs */}
              <div className="flex border-b border-border">
                {[
                  { id: 'outline' as SidebarTab, icon: List, label: 'Outline' },
                  { id: 'annotations' as SidebarTab, icon: MessageSquare, label: 'Comments' },
                  { id: 'bookmarks' as SidebarTab, icon: Bookmark, label: 'Bookmarks' },
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
                    <div className="text-xs font-medium text-text-muted uppercase mb-3">
                      Contents
                    </div>
                    {document.sections.map((section) => (
                      <OutlineItem
                        key={section.id}
                        section={section}
                        currentSectionId={currentSectionId}
                        expandedSections={expandedSections}
                        onNavigate={handleNavigate}
                        onToggle={handleToggleSection}
                      />
                    ))}
                  </div>
                )}

                {sidebarTab === 'annotations' && (
                  <div className="space-y-2">
                    <div className="text-xs font-medium text-text-muted uppercase mb-3">
                      Annotations ({annotations.length})
                    </div>
                    {annotations.map((annotation) => (
                      <AnnotationCard
                        key={annotation.id}
                        annotation={annotation}
                        isActive={activeAnnotationId === annotation.id}
                        onClick={() => setActiveAnnotationId(annotation.id)}
                        onResolve={() => {}}
                      />
                    ))}
                  </div>
                )}

                {sidebarTab === 'bookmarks' && (
                  <div className="text-center py-8 text-text-muted">
                    <Bookmark className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No bookmarks yet</p>
                    <p className="text-xs mt-1">Click the bookmark icon while reading</p>
                  </div>
                )}
              </div>
            </div>

            {/* Left resize handle */}
            <ResizeHandle
              direction="horizontal"
              onMouseDown={leftSidebarResize.handleMouseDown}
              isResizing={leftSidebarResize.isResizing}
            />
          </>
        )}

        {/* Main document area */}
        <div className="flex-1 min-w-0 overflow-auto bg-surface">
          <div className="max-w-4xl mx-auto p-8">
            {/* Document content */}
            {document.sections.map((section) => (
              <div
                key={section.id}
                id={section.id}
                className={`mb-8 ${fontSizeClasses[fontSize]}`}
              >
                <h2 className="text-xl font-semibold text-text-primary mb-4 flex items-center gap-2">
                  <span className="text-text-muted font-mono text-sm">{section.number}</span>
                  {section.title}
                  {!readOnly && onEdit && (
                    <button
                      onClick={() => onEdit(section.id)}
                      className="p-1 opacity-0 hover:opacity-100 text-text-muted hover:text-accent-blue transition-opacity"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  )}
                </h2>
                <p className="text-text-secondary">{section.content}</p>

                {section.subsections?.map((sub) => (
                  <div key={sub.id} className="mt-6 ml-6">
                    <h3 className="text-lg font-medium text-text-primary mb-3 flex items-center gap-2">
                      <span className="text-text-muted font-mono text-xs">{sub.number}</span>
                      {sub.title}
                    </h3>
                    <p className="text-text-secondary">{sub.content}</p>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Right Panel - Resizable */}
        {showRightPanel && (
          <>
            {/* Right resize handle */}
            <ResizeHandle
              direction="horizontal"
              onMouseDown={rightPanelResize.handleMouseDown}
              isResizing={rightPanelResize.isResizing}
            />

            <div
              className="flex-shrink-0 bg-surface-elevated border-l border-border flex flex-col overflow-hidden"
              style={{ width: rightPanelResize.size }}
            >
              <div className="p-3 border-b border-border flex items-center justify-between">
                <h3 className="font-semibold text-text-primary text-sm">Comments & Activity</h3>
                <button
                  onClick={() => setShowRightPanel(false)}
                  className="p-1 hover:bg-surface-card rounded text-text-muted"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-auto p-3">
                <div className="space-y-3">
                  {annotations
                    .filter((a) => !a.resolved)
                    .map((annotation) => (
                      <AnnotationCard
                        key={annotation.id}
                        annotation={annotation}
                        isActive={activeAnnotationId === annotation.id}
                        onClick={() => setActiveAnnotationId(annotation.id)}
                        onResolve={() => {}}
                      />
                    ))}
                </div>
              </div>

              {/* Comment input */}
              <div className="p-3 border-t border-border">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Add a comment..."
                    className="flex-1 px-3 py-2 bg-surface-card border border-border rounded-lg text-sm focus:outline-none focus:border-accent-blue"
                  />
                  <button className="p-2 bg-accent-blue text-white rounded-lg hover:bg-accent-blue/90">
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default ResizableDocumentViewer;
