

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

// ============================================================================
// TYPES
// ============================================================================

export interface ViewerDocument {
  id: string;
  title: string;
  shortTitle: string;
  documentType: string;
  version: string;
  status: string;
  author: string;
  lastModified: string;
  
  // Content
  sections: ViewerSection[];
  
  // Metadata
  productName?: string;
  studyName?: string;
  ctdSection?: string;
  wordCount: number;
  pageCount: number;
}

export interface ViewerSection {
  id: string;
  number: string;
  title: string;
  level: number;
  content: string;
  wordCount: number;
  subsections?: ViewerSection[];
}

export interface Annotation {
  id: string;
  documentId: string;
  sectionId: string;
  
  // Position
  startOffset: number;
  endOffset: number;
  selectedText: string;
  
  // Annotation type
  type: 'highlight' | 'comment' | 'question' | 'issue' | 'suggestion';
  color: 'yellow' | 'green' | 'blue' | 'pink' | 'orange';
  
  // Comment content
  content?: string;
  
  // Threading
  replies: AnnotationReply[];
  
  // Status
  status: 'open' | 'resolved' | 'rejected';
  resolvedBy?: string;
  resolvedAt?: string;
  
  // Metadata
  createdBy: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
}

export interface AnnotationReply {
  id: string;
  content: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
}

export interface ViewerBookmark {
  id: string;
  documentId: string;
  sectionId: string;
  title: string;
  note?: string;
  createdAt: string;
}

export interface ReadingProgress {
  documentId: string;
  lastSectionId: string;
  lastPosition: number;
  percentComplete: number;
  lastReadAt: string;
  sectionsRead: string[];
}

export type ViewMode = 'read' | 'review' | 'compare';
export type SidebarTab = 'outline' | 'annotations' | 'bookmarks' | 'search';
export type DocumentRenderMode = 'draft' | 'document';

// ============================================================================
// STORE STATE
// ============================================================================

interface DocumentViewerState {
  // Current document
  currentDocument: ViewerDocument | null;
  isLoading: boolean;
  
  // View settings
  viewMode: ViewMode;
  documentRenderMode: DocumentRenderMode; // v84: draft vs document fidelity
  sidebarTab: SidebarTab;
  showSidebar: boolean;
  showAnnotations: boolean;
  fontSize: 'small' | 'medium' | 'large';
  lineSpacing: 'compact' | 'normal' | 'relaxed';
  
  // Navigation
  currentSectionId: string | null;
  expandedSections: Set<string>;
  scrollPosition: number;
  
  // Selection
  selectedText: string | null;
  selectionRange: { start: number; end: number; sectionId: string } | null;
  
  // Annotations
  annotations: Record<string, Annotation[]>; // documentId -> annotations
  activeAnnotationId: string | null;
  annotationFilter: 'all' | 'open' | 'resolved' | Annotation['type'];
  
  // Bookmarks
  bookmarks: Record<string, ViewerBookmark[]>; // documentId -> bookmarks
  
  // Reading progress
  readingProgress: Record<string, ReadingProgress>; // documentId -> progress
  
  // Search
  searchQuery: string;
  searchResults: SearchResult[];
  currentSearchIndex: number;
  
  // Compare mode
  compareDocument: ViewerDocument | null;
  syncScroll: boolean;
  
  // Actions
  openDocument: (doc: ViewerDocument) => void;
  closeDocument: () => void;
  setLoading: (loading: boolean) => void;
  
  setViewMode: (mode: ViewMode) => void;
  setDocumentRenderMode: (mode: DocumentRenderMode) => void;
  setSidebarTab: (tab: SidebarTab) => void;
  toggleSidebar: () => void;
  toggleAnnotations: () => void;
  setFontSize: (size: 'small' | 'medium' | 'large') => void;
  setLineSpacing: (spacing: 'compact' | 'normal' | 'relaxed') => void;
  
  navigateToSection: (sectionId: string) => void;
  toggleSectionExpanded: (sectionId: string) => void;
  expandAllSections: () => void;
  collapseAllSections: () => void;
  setScrollPosition: (position: number) => void;
  
  setSelection: (text: string | null, range: { start: number; end: number; sectionId: string } | null) => void;
  clearSelection: () => void;
  
  addAnnotation: (annotation: Omit<Annotation, 'id' | 'createdAt' | 'updatedAt' | 'replies' | 'status'>) => Annotation;
  updateAnnotation: (annotationId: string, updates: Partial<Annotation>) => void;
  deleteAnnotation: (documentId: string, annotationId: string) => void;
  resolveAnnotation: (documentId: string, annotationId: string, resolvedBy: string) => void;
  addAnnotationReply: (documentId: string, annotationId: string, reply: Omit<AnnotationReply, 'id' | 'createdAt'>) => void;
  setActiveAnnotation: (annotationId: string | null) => void;
  setAnnotationFilter: (filter: 'all' | 'open' | 'resolved' | Annotation['type']) => void;
  getDocumentAnnotations: (documentId: string) => Annotation[];
  getSectionAnnotations: (documentId: string, sectionId: string) => Annotation[];
  
  addBookmark: (bookmark: Omit<ViewerBookmark, 'id' | 'createdAt'>) => ViewerBookmark;
  removeBookmark: (documentId: string, bookmarkId: string) => void;
  getDocumentBookmarks: (documentId: string) => ViewerBookmark[];
  
  updateReadingProgress: (documentId: string, sectionId: string, position: number) => void;
  markSectionRead: (documentId: string, sectionId: string) => void;
  getReadingProgress: (documentId: string) => ReadingProgress | null;
  
  setSearchQuery: (query: string) => void;
  performSearch: (query: string) => void;
  navigateSearchResult: (direction: 'next' | 'prev') => void;
  clearSearch: () => void;
  
  setCompareDocument: (doc: ViewerDocument | null) => void;
  toggleSyncScroll: () => void;
}

interface SearchResult {
  sectionId: string;
  sectionTitle: string;
  matchText: string;
  matchIndex: number;
  context: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const getAllSectionIds = (sections: ViewerSection[]): string[] => {
  const ids: string[] = [];
  const traverse = (secs: ViewerSection[]) => {
    secs.forEach(s => {
      ids.push(s.id);
      if (s.subsections) traverse(s.subsections);
    });
  };
  traverse(sections);
  return ids;
};

const countTotalWords = (sections: ViewerSection[]): number => {
  let total = 0;
  const traverse = (secs: ViewerSection[]) => {
    secs.forEach(s => {
      total += s.wordCount;
      if (s.subsections) traverse(s.subsections);
    });
  };
  traverse(sections);
  return total;
};

// ============================================================================
// STORE IMPLEMENTATION
// ============================================================================

export const useDocumentViewerStore = create<DocumentViewerState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        currentDocument: null,
        isLoading: false,
        
        viewMode: 'read',
        documentRenderMode: 'draft' as DocumentRenderMode,
        sidebarTab: 'outline',
        showSidebar: true,
        showAnnotations: true,
        fontSize: 'medium',
        lineSpacing: 'normal',
        
        currentSectionId: null,
        expandedSections: new Set<string>(),
        scrollPosition: 0,
        
        selectedText: null,
        selectionRange: null,
        
        annotations: {},
        activeAnnotationId: null,
        annotationFilter: 'all',
        
        bookmarks: {},
        
        readingProgress: {},
        
        searchQuery: '',
        searchResults: [],
        currentSearchIndex: 0,
        
        compareDocument: null,
        syncScroll: true,
        
        // Document actions
        openDocument: (doc) => {
          const allSectionIds = getAllSectionIds(doc.sections);
          set({
            currentDocument: doc,
            currentSectionId: doc.sections[0]?.id || null,
            expandedSections: new Set(allSectionIds),
            scrollPosition: 0,
            selectedText: null,
            selectionRange: null,
            activeAnnotationId: null,
            searchQuery: '',
            searchResults: [],
          }, false, 'openDocument');
        },
        
        closeDocument: () => {
          set({
            currentDocument: null,
            currentSectionId: null,
            expandedSections: new Set(),
            scrollPosition: 0,
            selectedText: null,
            selectionRange: null,
            activeAnnotationId: null,
            compareDocument: null,
          }, false, 'closeDocument');
        },
        
        setLoading: (loading) => set({ isLoading: loading }, false, 'setLoading'),
        
        // View settings
        setViewMode: (mode) => set({ viewMode: mode }, false, 'setViewMode'),
        setDocumentRenderMode: (mode) => set({ documentRenderMode: mode }, false, 'setDocumentRenderMode'),
        setSidebarTab: (tab) => set({ sidebarTab: tab }, false, 'setSidebarTab'),
        toggleSidebar: () => set((s) => ({ showSidebar: !s.showSidebar }), false, 'toggleSidebar'),
        toggleAnnotations: () => set((s) => ({ showAnnotations: !s.showAnnotations }), false, 'toggleAnnotations'),
        setFontSize: (size) => set({ fontSize: size }, false, 'setFontSize'),
        setLineSpacing: (spacing) => set({ lineSpacing: spacing }, false, 'setLineSpacing'),
        
        // Navigation
        navigateToSection: (sectionId) => {
          set({ currentSectionId: sectionId }, false, 'navigateToSection');
          // Update reading progress
          const doc = get().currentDocument;
          if (doc) {
            get().updateReadingProgress(doc.id, sectionId, 0);
          }
        },
        
        toggleSectionExpanded: (sectionId) => {
          set((state) => {
            const next = new Set(state.expandedSections);
            if (next.has(sectionId)) {
              next.delete(sectionId);
            } else {
              next.add(sectionId);
            }
            return { expandedSections: next };
          }, false, 'toggleSectionExpanded');
        },
        
        expandAllSections: () => {
          const doc = get().currentDocument;
          if (doc) {
            const allIds = getAllSectionIds(doc.sections);
            set({ expandedSections: new Set(allIds) }, false, 'expandAllSections');
          }
        },
        
        collapseAllSections: () => {
          set({ expandedSections: new Set() }, false, 'collapseAllSections');
        },
        
        setScrollPosition: (position) => set({ scrollPosition: position }, false, 'setScrollPosition'),
        
        // Selection
        setSelection: (text, range) => {
          set({ selectedText: text, selectionRange: range }, false, 'setSelection');
        },
        
        clearSelection: () => {
          set({ selectedText: null, selectionRange: null }, false, 'clearSelection');
        },
        
        // Annotations
        addAnnotation: (annotationData) => {
          const id = generateId();
          const now = new Date().toISOString();
          const annotation: Annotation = {
            ...annotationData,
            id,
            replies: [],
            status: 'open',
            createdAt: now,
            updatedAt: now,
          };
          
          set((state) => {
            const docAnnotations = state.annotations[annotationData.documentId] || [];
            return {
              annotations: {
                ...state.annotations,
                [annotationData.documentId]: [...docAnnotations, annotation],
              },
              selectedText: null,
              selectionRange: null,
            };
          }, false, 'addAnnotation');
          
          return annotation;
        },
        
        updateAnnotation: (annotationId, updates) => {
          set((state) => {
            const newAnnotations = { ...state.annotations };
            for (const docId in newAnnotations) {
              newAnnotations[docId] = newAnnotations[docId].map((a) =>
                a.id === annotationId
                  ? { ...a, ...updates, updatedAt: new Date().toISOString() }
                  : a
              );
            }
            return { annotations: newAnnotations };
          }, false, 'updateAnnotation');
        },
        
        deleteAnnotation: (documentId, annotationId) => {
          set((state) => {
            const docAnnotations = state.annotations[documentId] || [];
            return {
              annotations: {
                ...state.annotations,
                [documentId]: docAnnotations.filter((a) => a.id !== annotationId),
              },
              activeAnnotationId: state.activeAnnotationId === annotationId ? null : state.activeAnnotationId,
            };
          }, false, 'deleteAnnotation');
        },
        
        resolveAnnotation: (documentId, annotationId, resolvedBy) => {
          set((state) => {
            const docAnnotations = state.annotations[documentId] || [];
            return {
              annotations: {
                ...state.annotations,
                [documentId]: docAnnotations.map((a) =>
                  a.id === annotationId
                    ? { ...a, status: 'resolved' as const, resolvedBy, resolvedAt: new Date().toISOString() }
                    : a
                ),
              },
            };
          }, false, 'resolveAnnotation');
        },
        
        addAnnotationReply: (documentId, annotationId, replyData) => {
          const reply: AnnotationReply = {
            ...replyData,
            id: generateId(),
            createdAt: new Date().toISOString(),
          };
          
          set((state) => {
            const docAnnotations = state.annotations[documentId] || [];
            return {
              annotations: {
                ...state.annotations,
                [documentId]: docAnnotations.map((a) =>
                  a.id === annotationId
                    ? { ...a, replies: [...a.replies, reply], updatedAt: new Date().toISOString() }
                    : a
                ),
              },
            };
          }, false, 'addAnnotationReply');
        },
        
        setActiveAnnotation: (annotationId) => {
          set({ activeAnnotationId: annotationId }, false, 'setActiveAnnotation');
        },
        
        setAnnotationFilter: (filter) => {
          set({ annotationFilter: filter }, false, 'setAnnotationFilter');
        },
        
        getDocumentAnnotations: (documentId) => {
          const state = get();
          const annotations = state.annotations[documentId] || [];
          const filter = state.annotationFilter;
          
          if (filter === 'all') return annotations;
          if (filter === 'open') return annotations.filter((a) => a.status === 'open');
          if (filter === 'resolved') return annotations.filter((a) => a.status === 'resolved');
          return annotations.filter((a) => a.type === filter);
        },
        
        getSectionAnnotations: (documentId, sectionId) => {
          const annotations = get().annotations[documentId] || [];
          return annotations.filter((a) => a.sectionId === sectionId);
        },
        
        // Bookmarks
        addBookmark: (bookmarkData) => {
          const bookmark: ViewerBookmark = {
            ...bookmarkData,
            id: generateId(),
            createdAt: new Date().toISOString(),
          };
          
          set((state) => {
            const docBookmarks = state.bookmarks[bookmarkData.documentId] || [];
            // Don't add duplicate bookmarks for same section
            if (docBookmarks.some((b) => b.sectionId === bookmarkData.sectionId)) {
              return state;
            }
            return {
              bookmarks: {
                ...state.bookmarks,
                [bookmarkData.documentId]: [...docBookmarks, bookmark],
              },
            };
          }, false, 'addBookmark');
          
          return bookmark;
        },
        
        removeBookmark: (documentId, bookmarkId) => {
          set((state) => {
            const docBookmarks = state.bookmarks[documentId] || [];
            return {
              bookmarks: {
                ...state.bookmarks,
                [documentId]: docBookmarks.filter((b) => b.id !== bookmarkId),
              },
            };
          }, false, 'removeBookmark');
        },
        
        getDocumentBookmarks: (documentId) => {
          return get().bookmarks[documentId] || [];
        },
        
        // Reading progress
        updateReadingProgress: (documentId, sectionId, position) => {
          const doc = get().currentDocument;
          if (!doc) return;
          
          const existing = get().readingProgress[documentId];
          const sectionsRead = existing?.sectionsRead || [];
          if (!sectionsRead.includes(sectionId)) {
            sectionsRead.push(sectionId);
          }
          
          const allSectionIds = getAllSectionIds(doc.sections);
          const percentComplete = Math.round((sectionsRead.length / allSectionIds.length) * 100);
          
          set((state) => ({
            readingProgress: {
              ...state.readingProgress,
              [documentId]: {
                documentId,
                lastSectionId: sectionId,
                lastPosition: position,
                percentComplete,
                lastReadAt: new Date().toISOString(),
                sectionsRead,
              },
            },
          }), false, 'updateReadingProgress');
        },
        
        markSectionRead: (documentId, sectionId) => {
          get().updateReadingProgress(documentId, sectionId, 0);
        },
        
        getReadingProgress: (documentId) => {
          return get().readingProgress[documentId] || null;
        },
        
        // Search
        setSearchQuery: (query) => {
          set({ searchQuery: query }, false, 'setSearchQuery');
          if (query.trim().length >= 2) {
            get().performSearch(query);
          } else {
            set({ searchResults: [], currentSearchIndex: 0 });
          }
        },
        
        performSearch: (query) => {
          const doc = get().currentDocument;
          if (!doc || !query.trim()) {
            set({ searchResults: [], currentSearchIndex: 0 });
            return;
          }
          
          const results: SearchResult[] = [];
          const lowerQuery = query.toLowerCase();
          
          const searchSections = (sections: ViewerSection[]) => {
            sections.forEach((section) => {
              const content = section.content.toLowerCase();
              let index = 0;
              let matchIndex = 0;
              
              while ((index = content.indexOf(lowerQuery, index)) !== -1) {
                const start = Math.max(0, index - 50);
                const end = Math.min(content.length, index + query.length + 50);
                const context = section.content.substring(start, end);
                
                results.push({
                  sectionId: section.id,
                  sectionTitle: `${section.number} ${section.title}`,
                  matchText: section.content.substring(index, index + query.length),
                  matchIndex,
                  context: (start > 0 ? '...' : '') + context + (end < content.length ? '...' : ''),
                });
                
                matchIndex++;
                index += query.length;
              }
              
              if (section.subsections) {
                searchSections(section.subsections);
              }
            });
          };
          
          searchSections(doc.sections);
          
          set({ searchResults: results, currentSearchIndex: 0 }, false, 'performSearch');
        },
        
        navigateSearchResult: (direction) => {
          const { searchResults, currentSearchIndex } = get();
          if (searchResults.length === 0) return;
          
          let newIndex: number;
          if (direction === 'next') {
            newIndex = (currentSearchIndex + 1) % searchResults.length;
          } else {
            newIndex = currentSearchIndex === 0 ? searchResults.length - 1 : currentSearchIndex - 1;
          }
          
          const result = searchResults[newIndex];
          set({ currentSearchIndex: newIndex }, false, 'navigateSearchResult');
          get().navigateToSection(result.sectionId);
        },
        
        clearSearch: () => {
          set({ searchQuery: '', searchResults: [], currentSearchIndex: 0 }, false, 'clearSearch');
        },
        
        // Compare mode
        setCompareDocument: (doc) => {
          set({ compareDocument: doc, viewMode: doc ? 'compare' : 'read' }, false, 'setCompareDocument');
        },
        
        toggleSyncScroll: () => {
          set((s) => ({ syncScroll: !s.syncScroll }), false, 'toggleSyncScroll');
        },
      }),
      {
        name: 'ligature-document-viewer',
        partialize: (state) => ({
          annotations: state.annotations,
          bookmarks: state.bookmarks,
          readingProgress: state.readingProgress,
          fontSize: state.fontSize,
          lineSpacing: state.lineSpacing,
        }),
      }
    ),
    { name: 'DocumentViewerStore' }
  )
);
