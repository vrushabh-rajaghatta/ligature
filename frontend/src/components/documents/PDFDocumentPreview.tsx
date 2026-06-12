
// PDF Document Preview Component - v0.25.9
// Provides consistent PDF-style document preview across all document viewers
// This component should be the DEFAULT view for all document viewing panes
// v0.25.9: Fixed overlapping buttons with vector-based SVG icons and proper spacing


import { useState, useCallback, useMemo, useEffect } from 'react';
import { Badge } from '@/components/ui/Badge';

// =============================================================================
// VECTOR-BASED SVG ICONS
// Using inline SVG for pixel-perfect rendering without overlap
// =============================================================================

const IconFileText = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14,2 14,8 20,8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <line x1="10" y1="9" x2="8" y2="9" />
  </svg>
);

const IconZoomIn = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
    <line x1="11" y1="8" x2="11" y2="14" />
    <line x1="8" y1="11" x2="14" y2="11" />
  </svg>
);

const IconZoomOut = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
    <line x1="8" y1="11" x2="14" y2="11" />
  </svg>
);

const IconRotate = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="1,4 1,10 7,10" />
    <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
  </svg>
);

const IconDownload = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7,10 12,15 17,10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

const IconPrinter = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6,9 6,2 18,2 18,9" />
    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
    <rect x="6" y="14" width="12" height="8" />
  </svg>
);

const IconChevronLeft = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15,18 9,12 15,6" />
  </svg>
);

const IconChevronRight = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9,18 15,12 9,6" />
  </svg>
);

const IconSearch = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const IconEye = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const IconSplit = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12,5 19,12 12,19" />
    <polyline points="12,5 5,12 12,19" />
  </svg>
);

const IconX = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const IconShield = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);
import { 
  documentTemplateStyleService, 
  getDocumentTemplateCSS,
  type DocumentType 
} from '@/services/document-template-style-service';

// ============================================================================
// TYPES
// ============================================================================

export type PDFViewMode = 'pdf' | 'rendered' | 'split';

export interface DocumentSection {
  id: string;
  number: string;
  title: string;
  level: number;
  content?: string;
  children?: DocumentSection[];
}

export interface PDFDocumentPreviewProps {
  // Document metadata
  documentId: string;
  documentTitle: string;
  documentVersion: string;
  documentType?: DocumentType;
  documentStatus?: string;
  
  // Content
  sections?: DocumentSection[];
  rawContent?: string;
  pdfUrl?: string; // Optional: actual PDF URL if available
  
  // Optional metadata
  authorName?: string;
  authorDepartment?: string;
  effectiveDate?: string;
  securityClassification?: string;
  productName?: string;
  
  // View configuration
  defaultViewMode?: PDFViewMode; // Defaults to 'pdf'
  allowViewModeSwitch?: boolean;
  showToolbar?: boolean;
  showPageInfo?: boolean;
  
  // Callbacks
  onClose?: () => void;
  onDownload?: () => void;
  onPrint?: () => void;
  onViewModeChange?: (mode: PDFViewMode) => void;
}

// ============================================================================
// PDF PAGE SIMULATOR
// ============================================================================

interface PDFPageProps {
  pageNumber: number;
  totalPages: number;
  sections: DocumentSection[];
  documentType: DocumentType;
  zoom: number;
  documentTitle: string;
  documentId: string;
  documentVersion: string;
  authorName?: string;
  productName?: string;
}

function PDFPage({
  pageNumber,
  totalPages,
  sections,
  documentType,
  zoom,
  documentTitle,
  documentId,
  documentVersion,
  authorName,
  productName,
}: PDFPageProps) {
  const css = useMemo(() => getDocumentTemplateCSS(documentType), [documentType]);
  const styles = useMemo(
    () => documentTemplateStyleService.getInlineStyles(documentType),
    [documentType]
  );

  // Render sections for current page
  const renderSection = useCallback((section: DocumentSection, depth: number = 0) => {
    const HeadingTag = depth === 0 ? 'h2' : depth === 1 ? 'h3' : 'h4';
    const headingStyle = depth === 0 ? styles.h2 : depth === 1 ? styles.h3 : styles.h3;

    return (
      <div key={section.id} className={depth > 0 ? 'mt-4' : ''}>
        <HeadingTag style={headingStyle as any}>
          {section.number && <span className="text-slate-400 mr-2">{section.number}</span>}
          {section.title}
        </HeadingTag>
        {section.content && (
          <p style={styles.paragraph}>{section.content}</p>
        )}
        {section.children?.map(child => renderSection(child, depth + 1))}
      </div>
    );
  }, [styles]);

  return (
    <div
      className="bg-white shadow-lg mx-auto my-4"
      style={{
        width: `${8.5 * (zoom / 100)}in`,
        minHeight: `${11 * (zoom / 100)}in`,
        transform: `scale(${zoom / 100})`,
        transformOrigin: 'top center',
        padding: '1in 1in 1in 1.25in',
      }}
    >
      {/* PDF Page Content with Template Styles */}
      <style dangerouslySetInnerHTML={{ __html: css }} />
      
      {/* Page Header */}
      <div className="text-xs text-slate-400 mb-4 pb-2 border-b border-slate-200 flex justify-between">
        <span>{productName || 'Ligature Document'}</span>
        <span>{documentId} v{documentVersion}</span>
      </div>

      {/* Document Title (on first page) */}
      {pageNumber === 1 && (
        <div className="text-center mb-8 pb-6 border-b border-slate-300">
          <h1 style={styles.h1 as any}>{documentTitle}</h1>
          <div className="text-sm text-slate-600 mt-2">
            <p>Version {documentVersion}</p>
            {authorName && <p className="mt-1">Author: {authorName}</p>}
          </div>
        </div>
      )}

      {/* Content Sections */}
      <div className="document-template-content space-y-6">
        {sections.map(section => renderSection(section))}
      </div>

      {/* Page Footer */}
      <div className="absolute bottom-8 left-0 right-0 px-16 text-xs text-slate-400 flex justify-between border-t border-slate-200 pt-4">
        <span>CONFIDENTIAL</span>
        <span>Page {pageNumber} of {totalPages}</span>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function PDFDocumentPreview({
  documentId,
  documentTitle,
  documentVersion,
  documentType = 'generic',
  documentStatus,
  sections = [],
  rawContent,
  pdfUrl,
  authorName,
  authorDepartment,
  effectiveDate,
  securityClassification,
  productName,
  defaultViewMode = 'pdf', // Changed to 'pdf' as default
  allowViewModeSwitch = true,
  showToolbar = true,
  showPageInfo = true,
  onClose,
  onDownload,
  onPrint,
  onViewModeChange,
}: PDFDocumentPreviewProps) {
  const [viewMode, setViewMode] = useState<PDFViewMode>(defaultViewMode);
  const [zoom, setZoom] = useState(100);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  // Calculate total pages based on content
  const totalPages = useMemo(() => {
    // Estimate pages based on sections (rough calculation)
    const estimatedWordCount = sections.reduce((acc, section) => {
      const sectionWords = (section.content?.split(/\s+/).length || 0) + 
        (section.children?.reduce((childAcc, child) => 
          childAcc + (child.content?.split(/\s+/).length || 0), 0) || 0);
      return acc + sectionWords;
    }, 0);
    // Roughly 300 words per page
    return Math.max(1, Math.ceil(estimatedWordCount / 300));
  }, [sections]);

  // Handle view mode change
  const handleViewModeChange = useCallback((mode: PDFViewMode) => {
    setViewMode(mode);
    onViewModeChange?.(mode);
  }, [onViewModeChange]);

  // Zoom controls
  const handleZoomIn = () => setZoom(Math.min(200, zoom + 25));
  const handleZoomOut = () => setZoom(Math.max(25, zoom - 25));
  const handleZoomReset = () => setZoom(100);

  // Page navigation
  const goToPrevPage = () => setCurrentPage(Math.max(1, currentPage - 1));
  const goToNextPage = () => setCurrentPage(Math.min(totalPages, currentPage + 1));

  return (
    <div className="flex flex-col h-full bg-slate-800">
      {/* Toolbar - Vector-based icons with proper spacing */}
      {showToolbar && (
        <div className="flex-none bg-slate-900 border-b border-slate-700 px-3 py-2">
          <div className="flex items-center justify-between gap-4">
            {/* Left: View Mode Toggle */}
            <div className="flex-shrink-0 flex items-center">
              {allowViewModeSwitch && (
                <div className="inline-flex items-center p-0.5 bg-slate-800 rounded-lg">
                  <button
                    onClick={() => handleViewModeChange('pdf')}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                      viewMode === 'pdf'
                        ? 'bg-accent-blue text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                    title="PDF View (Recommended)"
                  >
                    <IconFileText className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>PDF</span>
                  </button>
                  <button
                    onClick={() => handleViewModeChange('rendered')}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                      viewMode === 'rendered'
                        ? 'bg-accent-blue text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                    title="Rendered View"
                  >
                    <IconEye className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>Rendered</span>
                  </button>
                  <button
                    onClick={() => handleViewModeChange('split')}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                      viewMode === 'split'
                        ? 'bg-accent-blue text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                    title="Split View"
                  >
                    <IconSplit className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>Split</span>
                  </button>
                </div>
              )}
            </div>

            {/* Center: Zoom Controls - Fixed width to prevent overlap */}
            <div className="flex-shrink-0 inline-flex items-center gap-1">
              <button
                onClick={handleZoomOut}
                className="w-8 h-8 inline-flex items-center justify-center rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
                title="Zoom Out"
              >
                <IconZoomOut className="w-4 h-4" />
              </button>
              <span className="w-12 text-xs text-slate-400 text-center tabular-nums">{zoom}%</span>
              <button
                onClick={handleZoomIn}
                className="w-8 h-8 inline-flex items-center justify-center rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
                title="Zoom In"
              >
                <IconZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={handleZoomReset}
                className="w-8 h-8 inline-flex items-center justify-center rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
                title="Reset Zoom"
              >
                <IconRotate className="w-4 h-4" />
              </button>
              <div className="w-px h-5 bg-slate-700 mx-1" />
            </div>

            {/* Right: Actions - Fixed width buttons to prevent overlap */}
            <div className="flex-shrink-0 inline-flex items-center gap-1">
              <button
                onClick={() => setShowSearch(!showSearch)}
                className={`w-8 h-8 inline-flex items-center justify-center rounded transition-colors ${
                  showSearch ? 'bg-slate-700 text-white' : 'hover:bg-slate-700 text-slate-400 hover:text-slate-200'
                }`}
                title="Search"
              >
                <IconSearch className="w-4 h-4" />
              </button>
              <button
                onClick={onPrint}
                className="w-8 h-8 inline-flex items-center justify-center rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
                title="Print"
              >
                <IconPrinter className="w-4 h-4" />
              </button>
              <button
                onClick={onDownload}
                className="w-8 h-8 inline-flex items-center justify-center rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
                title="Download"
              >
                <IconDownload className="w-4 h-4" />
              </button>
              {onClose && (
                <button
                  onClick={onClose}
                  className="w-8 h-8 inline-flex items-center justify-center rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
                  title="Close"
                >
                  <IconX className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Search Bar (collapsible) */}
          {showSearch && (
            <div className="mt-2 flex items-center gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search in document..."
                className="flex-1 px-3 py-1.5 text-sm bg-slate-800 border border-slate-700 rounded-lg text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-accent-blue"
              />
              <span className="text-xs text-slate-500">0 results</span>
            </div>
          )}
        </div>
      )}

      {/* Document Info Bar */}
      <div className="flex-none bg-slate-850 border-b border-slate-700 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-500/20 rounded-lg">
            <IconFileText className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <div className="text-sm font-medium text-slate-200">{documentTitle}</div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span>{documentId}</span>
              <span>•</span>
              <span>v{documentVersion}</span>
              {documentStatus && (
                <>
                  <span>•</span>
                  <Badge color="blue" size="xs">{documentStatus}</Badge>
                </>
              )}
            </div>
          </div>
        </div>
        
        {securityClassification && securityClassification !== 'public' && (
          <div className="flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/30 rounded-lg">
            <IconShield className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-medium text-amber-400 uppercase">
              {securityClassification}
            </span>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto">
        {viewMode === 'pdf' && (
          // PDF View - Show pages like a PDF
          <div className="min-h-full py-8 px-4 bg-slate-700">
            {pdfUrl ? (
              // If actual PDF URL provided, use iframe/embed
              <div className="w-full h-full flex items-center justify-center">
                <iframe
                  src={`${pdfUrl}#zoom=${zoom}`}
                  className="w-full h-full border-0"
                  title={documentTitle}
                />
              </div>
            ) : (
              // Otherwise render PDF-like pages from content
              <PDFPage
                pageNumber={currentPage}
                totalPages={totalPages}
                sections={sections}
                documentType={documentType}
                zoom={zoom}
                documentTitle={documentTitle}
                documentId={documentId}
                documentVersion={documentVersion}
                authorName={authorName}
                productName={productName}
              />
            )}
          </div>
        )}

        {viewMode === 'rendered' && (
          // Rendered View - Show styled content without PDF page structure
          <div className="bg-white min-h-full">
            <div
              className="document-template-content max-w-4xl mx-auto py-8"
              style={{ fontSize: `${zoom}%` }}
            >
              <style dangerouslySetInnerHTML={{ __html: getDocumentTemplateCSS(documentType) }} />
              
              {/* Document Title */}
              <div className="text-center mb-8 pb-6 border-b border-slate-200">
                <div className="text-sm text-slate-500 mb-2">{documentId}</div>
                <h1 className="text-2xl font-bold text-slate-900 mb-4">{documentTitle}</h1>
                <div className="text-sm text-slate-600">
                  <p>Version {documentVersion}</p>
                  {effectiveDate && <p className="mt-1">Effective: {effectiveDate}</p>}
                  {authorName && (
                    <p className="mt-1">Owner: {authorName} {authorDepartment && `| ${authorDepartment}`}</p>
                  )}
                </div>
              </div>

              {/* Content Sections */}
              <div className="space-y-8">
                {sections.map(section => (
                  <SectionContent key={section.id} section={section} depth={0} documentType={documentType} />
                ))}
              </div>
            </div>
          </div>
        )}

        {viewMode === 'split' && (
          // Split View - PDF on left, rendered on right
          <div className="flex h-full">
            <div className="flex-1 overflow-auto bg-slate-700">
              <PDFPage
                pageNumber={currentPage}
                totalPages={totalPages}
                sections={sections}
                documentType={documentType}
                zoom={zoom * 0.75}
                documentTitle={documentTitle}
                documentId={documentId}
                documentVersion={documentVersion}
                authorName={authorName}
                productName={productName}
              />
            </div>
            <div className="w-px bg-slate-600" />
            <div className="flex-1 overflow-auto bg-white p-8">
              <div className="document-template-content">
                <style dangerouslySetInnerHTML={{ __html: getDocumentTemplateCSS(documentType) }} />
                {sections.map(section => (
                  <SectionContent key={section.id} section={section} depth={0} documentType={documentType} />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Page Navigation Bar (for PDF view) - Vector-based icons */}
      {showPageInfo && viewMode === 'pdf' && (
        <div className="flex-none bg-slate-900 border-t border-slate-700 px-4 py-2">
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={goToPrevPage}
              disabled={currentPage <= 1}
              className="w-8 h-8 inline-flex items-center justify-center rounded hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-slate-400 hover:text-slate-200 transition-colors"
            >
              <IconChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm text-slate-300 tabular-nums">
              Page <span className="font-medium">{currentPage}</span> of <span className="font-medium">{totalPages}</span>
            </span>
            <button
              onClick={goToNextPage}
              disabled={currentPage >= totalPages}
              className="w-8 h-8 inline-flex items-center justify-center rounded hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-slate-400 hover:text-slate-200 transition-colors"
            >
              <IconChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

interface SectionContentProps {
  section: DocumentSection;
  depth: number;
  documentType: DocumentType;
}

function SectionContent({ section, depth, documentType }: SectionContentProps) {
  const styles = documentTemplateStyleService.getInlineStyles(documentType);
  const HeadingTag = depth === 0 ? 'h2' : depth === 1 ? 'h3' : 'h4';
  const headingStyle = depth === 0 ? styles.h2 : depth === 1 ? styles.h3 : styles.h3;

  return (
    <div className={depth > 0 ? 'mt-4' : ''}>
      <HeadingTag style={headingStyle as any}>
        {section.number && <span className="text-slate-400 mr-2">{section.number}</span>}
        {section.title}
      </HeadingTag>
      {section.content && (
        <p style={styles.paragraph} className="text-slate-600 leading-relaxed">
          {section.content}
        </p>
      )}
      {section.children && (
        <div className="mt-4 space-y-4">
          {section.children.map(child => (
            <SectionContent key={child.id} section={child} depth={depth + 1} documentType={documentType} />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// EXPORT DEFAULT VIEW MODE CONSTANT
// ============================================================================

/**
 * The platform-wide default view mode for document previews.
 * This should always be 'pdf' per the requirement that document viewing panes
 * should default to the actual PDF view.
 */
export const DEFAULT_DOCUMENT_VIEW_MODE: PDFViewMode = 'pdf';
