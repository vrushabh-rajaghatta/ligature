

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  ZoomIn, ZoomOut, Maximize2, Minimize2, Printer, Download,
  ChevronLeft, ChevronRight, FileText, Grid3X3, List, Eye, Edit3,
  BookOpen, Settings, Check, RotateCcw
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

export interface PagedSection {
  id: string;
  number: string;
  title: string;
  level: number;
  content: string;
  wordCount: number;
  subsections?: PagedSection[];
}

export interface PagedDocument {
  id: string;
  title: string;
  shortTitle?: string;
  documentType: string;
  version: string;
  status: string;
  author: string;
  lastModified: string;
  sections: PagedSection[];
  productName?: string;
  studyName?: string;
  ctdSection?: string;
  wordCount: number;
  pageCount: number;
  // Document formatting options
  format?: DocumentFormat;
}

export interface DocumentFormat {
  pageSize: 'letter' | 'a4';
  orientation: 'portrait' | 'landscape';
  margins: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  font: {
    family: string;
    size: number;
    lineHeight: number;
  };
  header?: {
    left?: string;
    center?: string;
    right?: string;
  };
  footer?: {
    left?: string;
    center?: string;
    right?: string;
    showPageNumbers?: boolean;
  };
}

interface PagedDocumentRendererProps {
  document: PagedDocument;
  onClose?: () => void;
  onEdit?: (sectionId: string) => void;
  readOnly?: boolean;
  initialPage?: number;
  showToolbar?: boolean;
  className?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

// Page dimensions in pixels (at 96 DPI)
const PAGE_SIZES = {
  letter: { width: 816, height: 1056 }, // 8.5" x 11"
  a4: { width: 794, height: 1123 }, // 210mm x 297mm
};

// Default document format - regulatory standard
const DEFAULT_FORMAT: DocumentFormat = {
  pageSize: 'letter',
  orientation: 'portrait',
  margins: {
    top: 72, // 0.75"
    right: 72, // 0.75"
    bottom: 72, // 0.75"
    left: 72, // 0.75"
  },
  font: {
    family: '"Times New Roman", Times, serif',
    size: 12,
    lineHeight: 1.5,
  },
  header: {
    left: '',
    center: '',
    right: '',
  },
  footer: {
    left: '',
    center: '',
    right: '',
    showPageNumbers: true,
  },
};

// Regulatory document styling - matches industry standards
const DOCUMENT_STYLES = `
  /* Base typography - regulatory standard */
  .paged-document-content {
    font-family: "Times New Roman", Times, Georgia, serif;
    font-size: 12pt;
    line-height: 1.5;
    color: #000000;
    text-align: justify;
    hyphens: auto;
  }
  
  /* Headings - ICH/FDA style */
  .paged-document-content h1 {
    font-size: 14pt;
    font-weight: bold;
    margin: 24pt 0 12pt 0;
    page-break-after: avoid;
    text-transform: uppercase;
  }
  
  .paged-document-content h2 {
    font-size: 12pt;
    font-weight: bold;
    margin: 18pt 0 6pt 0;
    page-break-after: avoid;
  }
  
  .paged-document-content h3 {
    font-size: 12pt;
    font-weight: bold;
    font-style: italic;
    margin: 12pt 0 6pt 0;
    page-break-after: avoid;
  }
  
  .paged-document-content h4 {
    font-size: 12pt;
    font-weight: normal;
    font-style: italic;
    margin: 12pt 0 6pt 0;
    page-break-after: avoid;
  }
  
  /* Paragraphs */
  .paged-document-content p {
    margin: 0 0 12pt 0;
    text-indent: 0;
    orphans: 2;
    widows: 2;
  }
  
  .paged-document-content p + p {
    text-indent: 0;
  }
  
  /* Lists */
  .paged-document-content ul,
  .paged-document-content ol {
    margin: 0 0 12pt 24pt;
    padding: 0;
  }
  
  .paged-document-content li {
    margin: 0 0 6pt 0;
  }
  
  .paged-document-content ul > li {
    list-style-type: disc;
  }
  
  .paged-document-content ul ul > li {
    list-style-type: circle;
  }
  
  .paged-document-content ol > li {
    list-style-type: decimal;
  }
  
  /* Tables - regulatory format with borders */
  .paged-document-content table {
    width: 100%;
    border-collapse: collapse;
    margin: 12pt 0;
    font-size: 10pt;
    page-break-inside: avoid;
  }
  
  .paged-document-content th {
    background-color: #f0f0f0;
    border: 1pt solid #000000;
    padding: 6pt 8pt;
    text-align: left;
    font-weight: bold;
    vertical-align: bottom;
  }
  
  .paged-document-content td {
    border: 1pt solid #000000;
    padding: 4pt 8pt;
    vertical-align: top;
  }
  
  .paged-document-content caption {
    font-weight: bold;
    text-align: left;
    margin-bottom: 6pt;
    caption-side: top;
  }
  
  /* Table notes */
  .paged-document-content .table-notes {
    font-size: 9pt;
    margin-top: 6pt;
  }
  
  /* Figures */
  .paged-document-content figure {
    margin: 12pt 0;
    page-break-inside: avoid;
  }
  
  .paged-document-content figcaption {
    font-size: 10pt;
    font-weight: bold;
    margin-top: 6pt;
  }
  
  /* Placeholders for TFLs */
  .paged-document-content .tfl-placeholder {
    border: 1pt dashed #666666;
    background-color: #fafafa;
    padding: 24pt;
    margin: 12pt 0;
    text-align: center;
    font-style: italic;
    color: #666666;
  }
  
  /* Strong/emphasis */
  .paged-document-content strong {
    font-weight: bold;
  }
  
  .paged-document-content em {
    font-style: italic;
  }
  
  /* Subscript/superscript */
  .paged-document-content sub {
    font-size: 8pt;
    vertical-align: sub;
  }
  
  .paged-document-content sup {
    font-size: 8pt;
    vertical-align: super;
  }
  
  /* Block quotes - for regulatory citations */
  .paged-document-content blockquote {
    margin: 12pt 36pt;
    font-size: 11pt;
    font-style: italic;
  }
  
  /* Code/verbatim */
  .paged-document-content code {
    font-family: "Courier New", Courier, monospace;
    font-size: 10pt;
  }
  
  .paged-document-content pre {
    font-family: "Courier New", Courier, monospace;
    font-size: 9pt;
    margin: 12pt 0;
    padding: 12pt;
    background-color: #f5f5f5;
    border: 1pt solid #cccccc;
    overflow-x: auto;
    white-space: pre-wrap;
  }
  
  /* Section breaks */
  .paged-document-content hr {
    border: none;
    border-top: 1pt solid #cccccc;
    margin: 24pt 0;
  }
  
  /* Page break hints */
  .paged-document-content .page-break {
    page-break-before: always;
  }
  
  .paged-document-content .keep-together {
    page-break-inside: avoid;
  }
`;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function estimatePageCount(sections: PagedSection[], format: DocumentFormat): number {
  // Rough estimate: ~3000 characters per page at 12pt with standard margins
  const charsPerPage = 3000;
  let totalChars = 0;
  
  const countChars = (section: PagedSection) => {
    // Strip HTML and count
    const textContent = section.content.replace(/<[^>]*>/g, '');
    totalChars += textContent.length;
    totalChars += section.title.length + 50; // Heading overhead
    section.subsections?.forEach(countChars);
  };
  
  sections.forEach(countChars);
  return Math.max(1, Math.ceil(totalChars / charsPerPage));
}

function flattenSections(sections: PagedSection[]): PagedSection[] {
  const result: PagedSection[] = [];
  const flatten = (section: PagedSection) => {
    result.push(section);
    section.subsections?.forEach(flatten);
  };
  sections.forEach(flatten);
  return result;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function PagedDocumentRenderer({
  document,
  onClose,
  onEdit,
  readOnly = true,
  initialPage = 1,
  showToolbar = true,
  className = '',
}: PagedDocumentRendererProps) {
  // Rename to 'doc' to avoid shadowing global 'document' object
  const doc = document;
  const format = doc.format || DEFAULT_FORMAT;
  const pageSize = PAGE_SIZES[format.pageSize];
  
  // State
  const [zoom, setZoom] = useState(100);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [viewMode, setViewMode] = useState<'single' | 'continuous' | 'two-page'>('continuous');
  const [showSettings, setShowSettings] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  
  // Calculate estimated page count
  const estimatedPages = useMemo(() => 
    estimatePageCount(doc.sections, format),
    [doc.sections, format]
  );
  
  // Flatten sections for rendering
  const allSections = useMemo(() => 
    flattenSections(doc.sections),
    [doc.sections]
  );
  
  // Zoom controls
  const handleZoomIn = () => setZoom(z => Math.min(200, z + 25));
  const handleZoomOut = () => setZoom(z => Math.max(50, z - 25));
  const handleZoomReset = () => setZoom(100);
  
  // Page navigation
  const handlePrevPage = () => setCurrentPage(p => Math.max(1, p - 1));
  const handleNextPage = () => setCurrentPage(p => Math.min(estimatedPages, p + 1));
  
  // Fullscreen toggle
  const toggleFullscreen = useCallback(() => {
    if (!doc) return;
    if (!isFullscreen) {
      containerRef.current?.requestFullscreen?.();
    } else {
      // Use window.document to access global document
      if (typeof window !== 'undefined') {
        window.document.exitFullscreen?.();
      }
    }
    setIsFullscreen(!isFullscreen);
  }, [doc, isFullscreen]);
  
  // Render section content with proper formatting
  const renderSectionContent = (section: PagedSection, isTopLevel: boolean = false) => {
    const headingLevel = Math.min(section.level + 1, 4);
    const HeadingTag = `h${headingLevel}` as 'h1' | 'h2' | 'h3' | 'h4';
    
    return (
      <div key={section.id} className="section-block" data-section-id={section.id}>
        <HeadingTag className="section-heading">
          <span className="section-number">{section.number}</span>{' '}
          {section.title}
        </HeadingTag>
        <div 
          className="section-content"
          dangerouslySetInnerHTML={{ __html: section.content }}
        />
      </div>
    );
  };
  
  // Calculate scaled dimensions
  const scaledWidth = (pageSize.width * zoom) / 100;
  const scaledHeight = (pageSize.height * zoom) / 100;
  
  return (
    <div 
      ref={containerRef}
      className={`flex flex-col h-full bg-slate-200 ${className}`}
    >
      {/* Inject document styles */}
      <style dangerouslySetInnerHTML={{ __html: DOCUMENT_STYLES }} />
      
      {/* Toolbar */}
      {showToolbar && (
        <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-slate-300 shadow-sm flex-shrink-0">
          {/* Left: Document info */}
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-slate-600" />
            <div>
              <div className="text-sm font-medium text-slate-900 truncate max-w-[300px]">
                {doc.title}
              </div>
              <div className="text-xs text-slate-500">
                v{doc.version} • {doc.wordCount.toLocaleString()} words • ~{estimatedPages} pages
              </div>
            </div>
          </div>
          
          {/* Center: Zoom and view controls */}
          <div className="flex items-center gap-2">
            {/* Zoom controls */}
            <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
              <button
                onClick={handleZoomOut}
                disabled={zoom <= 50}
                className="p-1.5 rounded hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4 text-slate-600" />
              </button>
              <button
                onClick={handleZoomReset}
                className="px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200 rounded min-w-[48px] transition-colors"
                title="Reset Zoom"
              >
                {zoom}%
              </button>
              <button
                onClick={handleZoomIn}
                disabled={zoom >= 200}
                className="p-1.5 rounded hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4 text-slate-600" />
              </button>
            </div>
            
            {/* View mode selector */}
            <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1 ml-2">
              <button
                onClick={() => setViewMode('single')}
                className={`p-1.5 rounded transition-colors ${
                  viewMode === 'single' ? 'bg-white shadow-sm' : 'hover:bg-slate-200'
                }`}
                title="Single Page"
              >
                <FileText className="w-4 h-4 text-slate-600" />
              </button>
              <button
                onClick={() => setViewMode('continuous')}
                className={`p-1.5 rounded transition-colors ${
                  viewMode === 'continuous' ? 'bg-white shadow-sm' : 'hover:bg-slate-200'
                }`}
                title="Continuous Scroll"
              >
                <List className="w-4 h-4 text-slate-600" />
              </button>
              <button
                onClick={() => setViewMode('two-page')}
                className={`p-1.5 rounded transition-colors ${
                  viewMode === 'two-page' ? 'bg-white shadow-sm' : 'hover:bg-slate-200'
                }`}
                title="Two Pages"
              >
                <Grid3X3 className="w-4 h-4 text-slate-600" />
              </button>
            </div>
          </div>
          
          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            {/* Page navigation (single page mode) */}
            {viewMode === 'single' && (
              <div className="flex items-center gap-1 mr-2">
                <button
                  onClick={handlePrevPage}
                  disabled={currentPage <= 1}
                  className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4 text-slate-600" />
                </button>
                <span className="text-xs text-slate-600 min-w-[60px] text-center">
                  {currentPage} / {estimatedPages}
                </span>
                <button
                  onClick={handleNextPage}
                  disabled={currentPage >= estimatedPages}
                  className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4 text-slate-600" />
                </button>
              </div>
            )}
            
            <button
              onClick={() => window.print()}
              className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
              title="Print"
            >
              <Printer className="w-4 h-4 text-slate-600" />
            </button>
            <button
              className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
              title="Download PDF"
            >
              <Download className="w-4 h-4 text-slate-600" />
            </button>
            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? (
                <Minimize2 className="w-4 h-4 text-slate-600" />
              ) : (
                <Maximize2 className="w-4 h-4 text-slate-600" />
              )}
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="ml-2 px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Close
              </button>
            )}
          </div>
        </div>
      )}
      
      {/* Document view area */}
      <div 
        ref={contentRef}
        className="flex-1 overflow-auto p-8"
        style={{
          background: 'linear-gradient(to bottom, #e2e8f0, #cbd5e1)',
        }}
      >
        <div 
          className={`mx-auto ${viewMode === 'two-page' ? 'flex gap-8 justify-center' : ''}`}
          style={{
            width: viewMode === 'two-page' ? 'auto' : scaledWidth,
          }}
        >
          {/* Render pages */}
          {viewMode === 'continuous' ? (
            // Continuous mode: one long page with content
            <div
              className="bg-white shadow-xl mx-auto"
              style={{
                width: scaledWidth,
                minHeight: scaledHeight,
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06), 0 0 0 1px rgba(0, 0, 0, 0.05)',
              }}
            >
              {/* Header */}
              <div 
                className="border-b border-slate-200"
                style={{
                  padding: `${(format.margins.top * zoom) / 100}px ${(format.margins.right * zoom) / 100}px ${(24 * zoom) / 100}px ${(format.margins.left * zoom) / 100}px`,
                }}
              >
                <div className="flex justify-between items-center text-slate-400" style={{ fontSize: `${(9 * zoom) / 100}pt` }}>
                  <span>{format.header?.left || doc.productName || ''}</span>
                  <span>{format.header?.center || doc.title || ''}</span>
                  <span>{format.header?.right || `Version ${doc.version}`}</span>
                </div>
              </div>
              
              {/* Document content */}
              <div
                className="paged-document-content"
                style={{
                  padding: `${(24 * zoom) / 100}px ${(format.margins.right * zoom) / 100}px ${(format.margins.bottom * zoom) / 100}px ${(format.margins.left * zoom) / 100}px`,
                  fontSize: `${(format.font.size * zoom) / 100}pt`,
                  lineHeight: format.font.lineHeight,
                  fontFamily: format.font.family,
                }}
              >
                {/* Title page content */}
                <div className="text-center mb-12" style={{ paddingTop: `${(100 * zoom) / 100}px` }}>
                  <div className="text-slate-500 uppercase tracking-wider mb-4" style={{ fontSize: `${(10 * zoom) / 100}pt` }}>
                    {doc.documentType}
                  </div>
                  <h1 className="font-bold text-slate-900 mb-6" style={{ fontSize: `${(18 * zoom) / 100}pt` }}>
                    {doc.title}
                  </h1>
                  {doc.productName && (
                    <div className="text-slate-700 mb-2" style={{ fontSize: `${(14 * zoom) / 100}pt` }}>
                      {doc.productName}
                    </div>
                  )}
                  {doc.studyName && (
                    <div className="text-slate-600 mb-8" style={{ fontSize: `${(12 * zoom) / 100}pt` }}>
                      {doc.studyName}
                    </div>
                  )}
                  <div className="text-slate-500" style={{ fontSize: `${(10 * zoom) / 100}pt` }}>
                    <div>Version {doc.version}</div>
                    <div className="mt-1">{new Date(doc.lastModified).toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}</div>
                    <div className="mt-4">{doc.author}</div>
                  </div>
                </div>
                
                {/* Section content */}
                <div className="mt-16">
                  {doc.sections.map((section, idx) => (
                    <div key={section.id}>
                      {renderSectionContent(section, true)}
                      {section.subsections?.map(sub => renderSectionContent(sub))}
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Footer */}
              <div 
                className="border-t border-slate-200 mt-auto"
                style={{
                  padding: `${(24 * zoom) / 100}px ${(format.margins.right * zoom) / 100}px ${(format.margins.bottom * zoom) / 100}px ${(format.margins.left * zoom) / 100}px`,
                }}
              >
                <div className="flex justify-between items-center text-slate-400" style={{ fontSize: `${(9 * zoom) / 100}pt` }}>
                  <span>{format.footer?.left || 'Confidential'}</span>
                  <span>{format.footer?.center || ''}</span>
                  <span>{format.footer?.showPageNumbers ? 'Page 1' : (format.footer?.right || '')}</span>
                </div>
              </div>
            </div>
          ) : (
            // Single or two-page mode: paginated view
            <div
              className="bg-white shadow-xl"
              style={{
                width: scaledWidth,
                height: scaledHeight,
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06), 0 0 0 1px rgba(0, 0, 0, 0.05)',
              }}
            >
              {/* Header */}
              <div 
                className="border-b border-slate-100"
                style={{
                  padding: `${(format.margins.top * zoom) / 100}px ${(format.margins.right * zoom) / 100}px ${(12 * zoom) / 100}px ${(format.margins.left * zoom) / 100}px`,
                }}
              >
                <div className="flex justify-between items-center text-slate-400" style={{ fontSize: `${(9 * zoom) / 100}pt` }}>
                  <span>{doc.productName || ''}</span>
                  <span>{doc.title}</span>
                  <span>Version {doc.version}</span>
                </div>
              </div>
              
              {/* Page content */}
              <div
                className="paged-document-content overflow-hidden"
                style={{
                  padding: `${(12 * zoom) / 100}px ${(format.margins.right * zoom) / 100}px`,
                  height: `calc(100% - ${((format.margins.top + format.margins.bottom + 48) * zoom) / 100}px)`,
                  fontSize: `${(format.font.size * zoom) / 100}pt`,
                  lineHeight: format.font.lineHeight,
                  fontFamily: format.font.family,
                }}
              >
                {/* Show page-specific content based on currentPage */}
                {currentPage === 1 ? (
                  <div className="text-center pt-24">
                    <div className="text-slate-500 uppercase tracking-wider mb-4" style={{ fontSize: `${(10 * zoom) / 100}pt` }}>
                      {doc.documentType}
                    </div>
                    <h1 className="font-bold text-slate-900 mb-6" style={{ fontSize: `${(16 * zoom) / 100}pt` }}>
                      {doc.title}
                    </h1>
                    {doc.productName && (
                      <div className="text-slate-700 mb-8" style={{ fontSize: `${(12 * zoom) / 100}pt` }}>
                        {doc.productName}
                      </div>
                    )}
                    <div className="text-slate-500 mt-12" style={{ fontSize: `${(10 * zoom) / 100}pt` }}>
                      <div>Version {doc.version}</div>
                      <div className="mt-1">{new Date(doc.lastModified).toLocaleDateString()}</div>
                    </div>
                  </div>
                ) : (
                  <div className="text-slate-600 text-center pt-24" style={{ fontSize: `${(11 * zoom) / 100}pt` }}>
                    <BookOpen className="w-8 h-8 mx-auto mb-4 opacity-50" />
                    <p>Content for page {currentPage}</p>
                    <p className="text-sm mt-2 text-slate-400">
                      (Paginated view shows document sections split across pages)
                    </p>
                  </div>
                )}
              </div>
              
              {/* Footer */}
              <div 
                className="border-t border-slate-100 absolute bottom-0 left-0 right-0"
                style={{
                  padding: `${(12 * zoom) / 100}px ${(format.margins.right * zoom) / 100}px ${(format.margins.bottom * zoom) / 100}px ${(format.margins.left * zoom) / 100}px`,
                }}
              >
                <div className="flex justify-between items-center text-slate-400" style={{ fontSize: `${(9 * zoom) / 100}pt` }}>
                  <span>Confidential</span>
                  <span></span>
                  <span>Page {currentPage} of {estimatedPages}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default PagedDocumentRenderer;
