

import React, { useState, useMemo } from 'react';
import {
  FileText, BookOpen, Eye, Edit3, ZoomIn, ZoomOut, Printer,
  ChevronDown, ChevronRight, Layout, Maximize2, Minimize2,
  Download, Settings, Check, AlignJustify, List
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// ============================================================================
// TYPES
// ============================================================================

export interface DocumentFormat {
  pageSize: 'letter' | 'a4';
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
    showPageNumbers?: boolean;
    companyName?: string;
    confidential?: boolean;
  };
}

export interface DocumentMetadata {
  title: string;
  shortTitle?: string;
  documentType: string;
  version: string;
  productName?: string;
  studyName?: string;
  ctdSection?: string;
  author?: string;
  status?: string;
}

interface ProfessionalDocumentPreviewProps {
  content: string;
  metadata: DocumentMetadata;
  format?: Partial<DocumentFormat>;
  showHeader?: boolean;
  showFooter?: boolean;
  showToolbar?: boolean;
  onEdit?: () => void;
  editable?: boolean;
  className?: string;
}

// ============================================================================
// DEFAULT FORMAT - ICH/FDA Regulatory Standard
// ============================================================================

const DEFAULT_FORMAT: DocumentFormat = {
  pageSize: 'letter',
  margins: {
    top: 72, // 0.75"
    right: 72,
    bottom: 72,
    left: 72,
  },
  font: {
    family: '"Times New Roman", Times, Georgia, serif',
    size: 12,
    lineHeight: 1.5,
  },
  header: {
    left: '',
    center: '',
    right: '',
  },
  footer: {
    showPageNumbers: true,
    confidential: true,
  },
};

// ============================================================================
// DOCUMENT TYPE CONFIGURATIONS - ICH E3 / CTD Module Styles
// ============================================================================

const DOCUMENT_TYPE_CONFIG: Record<string, {
  headerStyle: string;
  templateName: string;
  ctdModule?: string;
}> = {
  'csr': {
    headerStyle: 'ICH E3 Clinical Study Report',
    templateName: 'ICH E3 (Clinical Study Report)',
    ctdModule: 'Module 5',
  },
  'ib': {
    headerStyle: 'Investigator\'s Brochure',
    templateName: 'ICH E6 (Investigator Brochure)',
    ctdModule: 'Module 5',
  },
  'protocol': {
    headerStyle: 'Clinical Protocol',
    templateName: 'ICH E6 (Protocol)',
    ctdModule: 'Module 5',
  },
  'module-25': {
    headerStyle: 'Clinical Overview',
    templateName: 'CTD Module 2.5',
    ctdModule: 'Module 2.5',
  },
  'module-27': {
    headerStyle: 'Clinical Summary',
    templateName: 'CTD Module 2.7',
    ctdModule: 'Module 2.7',
  },
  'dsur': {
    headerStyle: 'Development Safety Update Report',
    templateName: 'ICH E2F (DSUR)',
    ctdModule: 'Module 5',
  },
  'pbrer': {
    headerStyle: 'Periodic Benefit-Risk Evaluation Report',
    templateName: 'ICH E2C (PBRER)',
    ctdModule: 'Module 5',
  },
};

// ============================================================================
// PROFESSIONAL DOCUMENT PREVIEW COMPONENT
// ============================================================================

export function ProfessionalDocumentPreview({
  content,
  metadata,
  format: customFormat,
  showHeader = true,
  showFooter = true,
  showToolbar = true,
  onEdit,
  editable = false,
  className = '',
}: ProfessionalDocumentPreviewProps) {
  const [zoom, setZoom] = useState(100);
  const [viewMode, setViewMode] = useState<'page' | 'continuous'>('page');
  const [showOutline, setShowOutline] = useState(false);
  
  const format = useMemo(() => ({
    ...DEFAULT_FORMAT,
    ...customFormat,
  }), [customFormat]);
  
  const docConfig = DOCUMENT_TYPE_CONFIG[metadata.documentType] || {
    headerStyle: 'Regulatory Document',
    templateName: 'Standard Template',
  };
  
  // Convert markdown content to structured sections for outline
  const sections = useMemo(() => {
    const headingRegex = /^(#{1,4})\s+(.+)$/gm;
    const result: Array<{ level: number; title: string; id: string }> = [];
    let match;
    let index = 0;
    
    while ((match = headingRegex.exec(content)) !== null) {
      result.push({
        level: match[1].length,
        title: match[2].replace(/\*\*/g, ''),
        id: `section-${index++}`,
      });
    }
    
    return result;
  }, [content]);
  
  const handleZoomIn = () => setZoom(Math.min(200, zoom + 25));
  const handleZoomOut = () => setZoom(Math.max(50, zoom - 25));
  const handleResetZoom = () => setZoom(100);

  return (
    <div className={`flex flex-col h-full bg-slate-800 ${className}`}>
      {/* Toolbar */}
      {showToolbar && (
        <div className="flex items-center justify-between px-4 py-2 bg-surface-elevated border-b border-border">
          {/* Left: Template Info */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-accent-blue/10 rounded-lg border border-accent-blue/30">
              <FileText className="w-4 h-4 text-accent-blue" />
              <span className="text-sm font-medium text-accent-blue">{docConfig.templateName}</span>
            </div>
            {docConfig.ctdModule && (
              <span className="text-xs text-text-muted px-2 py-1 bg-surface-card rounded">
                {docConfig.ctdModule}
              </span>
            )}
          </div>
          
          {/* Center: View Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowOutline(!showOutline)}
              className={`p-2 rounded-lg transition-colors ${
                showOutline ? 'bg-accent-blue/20 text-accent-blue' : 'text-text-muted hover:text-text-primary hover:bg-surface-card'
              }`}
              title="Toggle Outline"
            >
              <List className="w-4 h-4" />
            </button>
            <div className="h-4 w-px bg-border mx-1" />
            <button
              onClick={handleZoomOut}
              className="p-2 text-text-muted hover:text-text-primary hover:bg-surface-card rounded-lg"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={handleResetZoom}
              className="px-2 py-1 text-xs text-text-muted hover:text-text-primary min-w-[48px]"
            >
              {zoom}%
            </button>
            <button
              onClick={handleZoomIn}
              className="p-2 text-text-muted hover:text-text-primary hover:bg-surface-card rounded-lg"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <div className="h-4 w-px bg-border mx-1" />
            <button
              onClick={() => setViewMode(viewMode === 'page' ? 'continuous' : 'page')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'page' ? 'bg-accent-blue/20 text-accent-blue' : 'text-text-muted hover:text-text-primary hover:bg-surface-card'
              }`}
              title={viewMode === 'page' ? 'Page View' : 'Continuous View'}
            >
              <Layout className="w-4 h-4" />
            </button>
          </div>
          
          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            {editable && onEdit && (
              <button
                onClick={onEdit}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-accent-blue hover:bg-accent-blue/10 rounded-lg transition-colors"
              >
                <Edit3 className="w-4 h-4" />
                Edit
              </button>
            )}
            <button
              className="p-2 text-text-muted hover:text-text-primary hover:bg-surface-card rounded-lg"
              title="Print"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              className="p-2 text-text-muted hover:text-text-primary hover:bg-surface-card rounded-lg"
              title="Download"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
      
      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Outline Panel */}
        {showOutline && (
          <div className="hidden lg:block w-64 border-r border-border bg-surface overflow-auto">
            <div className="p-3 border-b border-border">
              <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                Document Outline
              </h3>
            </div>
            <div className="p-2">
              {sections.length > 0 ? (
                <ul className="space-y-1">
                  {sections.map((section, idx) => (
                    <li
                      key={idx}
                      style={{ paddingLeft: `${(section.level - 1) * 12}px` }}
                      className="text-xs text-text-muted hover:text-text-primary cursor-pointer py-1 px-2 hover:bg-surface-card rounded truncate"
                    >
                      {section.title}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-text-muted p-2">No sections detected</p>
              )}
            </div>
          </div>
        )}
        
        {/* Document Preview */}
        <div className="flex-1 overflow-auto bg-slate-700 p-8 flex justify-center">
          <div
            className="bg-white shadow-2xl transition-transform"
            style={{
              width: `${816 * (zoom / 100)}px`,
              minHeight: `${1056 * (zoom / 100)}px`,
              transform: `scale(${zoom / 100})`,
              transformOrigin: 'top center',
            }}
          >
            {/* Page Container */}
            <div
              className="regulatory-document"
              style={{
                fontFamily: format.font.family,
                fontSize: `${format.font.size}pt`,
                lineHeight: format.font.lineHeight,
                padding: `${format.margins.top}px ${format.margins.right}px ${format.margins.bottom}px ${format.margins.left}px`,
                color: '#000',
                minHeight: '100%',
              }}
            >
              {/* Document Header */}
              {showHeader && (
                <header className="mb-8 pb-4 border-b-2 border-gray-300">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="text-[10pt] text-gray-600 uppercase tracking-wide">
                        {metadata.productName || 'Product Name'}
                      </p>
                      <p className="text-[10pt] text-gray-500">
                        {metadata.studyName || 'Study Name'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10pt] text-gray-600">
                        Version {metadata.version}
                      </p>
                      <p className="text-[10pt] text-gray-500">
                        {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                      </p>
                    </div>
                  </div>
                  
                  {/* Document Title */}
                  <div className="text-center mt-6">
                    <p className="text-[10pt] uppercase tracking-wider text-gray-500 mb-2">
                      {docConfig.headerStyle}
                    </p>
                    <h1 className="text-[16pt] font-bold uppercase">
                      {metadata.title}
                    </h1>
                    {metadata.shortTitle && (
                      <p className="text-[11pt] text-gray-600 mt-1">
                        ({metadata.shortTitle})
                      </p>
                    )}
                  </div>
                </header>
              )}
              
              {/* Document Content - Rendered from Markdown with AMA/ICH Styling */}
              <div className="regulatory-content">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    // Headings - ICH/AMA Style
                    h1: ({ children }) => (
                      <h1 className="text-[14pt] font-bold uppercase mt-6 mb-3 pb-2 border-b border-gray-300">
                        {children}
                      </h1>
                    ),
                    h2: ({ children }) => (
                      <h2 className="text-[12pt] font-bold mt-5 mb-2">
                        {children}
                      </h2>
                    ),
                    h3: ({ children }) => (
                      <h3 className="text-[12pt] font-bold italic mt-4 mb-2">
                        {children}
                      </h3>
                    ),
                    h4: ({ children }) => (
                      <h4 className="text-[12pt] italic mt-3 mb-2">
                        {children}
                      </h4>
                    ),
                    // Paragraphs
                    p: ({ children }) => (
                      <p className="text-justify mb-3 leading-relaxed" style={{ textIndent: 0 }}>
                        {children}
                      </p>
                    ),
                    // Lists
                    ul: ({ children }) => (
                      <ul className="ml-6 mb-3 list-disc space-y-1">
                        {children}
                      </ul>
                    ),
                    ol: ({ children }) => (
                      <ol className="ml-6 mb-3 list-decimal space-y-1">
                        {children}
                      </ol>
                    ),
                    li: ({ children }) => (
                      <li className="leading-relaxed">
                        {children}
                      </li>
                    ),
                    // Tables - Regulatory Style
                    table: ({ children }) => (
                      <div className="my-4 overflow-x-auto">
                        <table className="w-full border-collapse text-[10pt]">
                          {children}
                        </table>
                      </div>
                    ),
                    thead: ({ children }) => (
                      <thead className="bg-gray-100 border-t-2 border-b-2 border-gray-400">
                        {children}
                      </thead>
                    ),
                    tbody: ({ children }) => (
                      <tbody className="border-b border-gray-400">
                        {children}
                      </tbody>
                    ),
                    tr: ({ children }) => (
                      <tr className="border-b border-gray-200">
                        {children}
                      </tr>
                    ),
                    th: ({ children }) => (
                      <th className="px-3 py-2 text-left font-bold text-[10pt] uppercase">
                        {children}
                      </th>
                    ),
                    td: ({ children }) => (
                      <td className="px-3 py-2 border-b border-gray-200">
                        {children}
                      </td>
                    ),
                    // Strong/Bold - Used sparingly per AMA
                    strong: ({ children }) => (
                      <strong className="font-bold">
                        {children}
                      </strong>
                    ),
                    // Emphasis/Italic - For P values per AMA
                    em: ({ children }) => (
                      <em className="italic">
                        {children}
                      </em>
                    ),
                    // Code blocks for source citations
                    code: ({ children, className }) => {
                      if (className?.includes('language-')) {
                        return (
                          <pre className="bg-gray-100 p-3 rounded text-[9pt] overflow-x-auto my-3 border border-gray-300">
                            <code>{children}</code>
                          </pre>
                        );
                      }
                      // Inline code for citations
                      return (
                        <code className="text-[10pt] text-blue-800 bg-blue-50 px-1 rounded">
                          {children}
                        </code>
                      );
                    },
                    // Blockquotes for notes/TFL placeholders
                    blockquote: ({ children }) => (
                      <blockquote className="border-l-4 border-gray-400 pl-4 my-4 italic text-gray-600 bg-gray-50 py-2">
                        {children}
                      </blockquote>
                    ),
                    // Horizontal rules for section breaks
                    hr: () => (
                      <hr className="my-6 border-t-2 border-gray-300" />
                    ),
                  }}
                >
                  {content}
                </ReactMarkdown>
              </div>
              
              {/* Document Footer */}
              {showFooter && (
                <footer className="mt-8 pt-4 border-t border-gray-300 text-[9pt] text-gray-500">
                  <div className="flex justify-between">
                    <div>
                      {format.footer?.confidential && (
                        <p className="uppercase tracking-wide">Confidential</p>
                      )}
                      <p>{format.footer?.companyName || 'Ligature Technologies'}</p>
                    </div>
                    <div className="text-right">
                      {format.footer?.showPageNumbers && (
                        <p>Page 1 of 1</p>
                      )}
                    </div>
                  </div>
                </footer>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// COMPACT PREVIEW VARIANT - For inline embedding
// ============================================================================

interface CompactPreviewProps {
  content: string;
  metadata: DocumentMetadata;
  maxHeight?: string;
  className?: string;
}

export function CompactDocumentPreview({
  content,
  metadata,
  maxHeight = '400px',
  className = '',
}: CompactPreviewProps) {
  const docConfig = DOCUMENT_TYPE_CONFIG[metadata.documentType] || {
    headerStyle: 'Regulatory Document',
    templateName: 'Standard Template',
  };

  return (
    <div className={`rounded-lg border border-border overflow-hidden ${className}`}>
      {/* Mini Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-surface-elevated border-b border-border">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-accent-blue" />
          <span className="text-xs font-medium text-text-primary">{docConfig.templateName}</span>
        </div>
        <span className="text-xs text-text-muted">Preview</span>
      </div>
      
      {/* Content Preview - Regulatory Styled */}
      <div
        className="overflow-auto bg-white p-4"
        style={{
          maxHeight,
          fontFamily: '"Times New Roman", Times, Georgia, serif',
          fontSize: '11pt',
          lineHeight: 1.5,
          color: '#000',
        }}
      >
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            h1: ({ children }) => (
              <h1 className="text-[13pt] font-bold uppercase mt-4 mb-2 pb-1 border-b border-gray-300">
                {children}
              </h1>
            ),
            h2: ({ children }) => (
              <h2 className="text-[11pt] font-bold mt-3 mb-1.5">
                {children}
              </h2>
            ),
            h3: ({ children }) => (
              <h3 className="text-[11pt] font-bold italic mt-2.5 mb-1">
                {children}
              </h3>
            ),
            p: ({ children }) => (
              <p className="text-justify mb-2 leading-relaxed text-[10pt]">
                {children}
              </p>
            ),
            ul: ({ children }) => (
              <ul className="ml-5 mb-2 list-disc space-y-0.5 text-[10pt]">
                {children}
              </ul>
            ),
            ol: ({ children }) => (
              <ol className="ml-5 mb-2 list-decimal space-y-0.5 text-[10pt]">
                {children}
              </ol>
            ),
            table: ({ children }) => (
              <div className="my-3 overflow-x-auto">
                <table className="w-full border-collapse text-[9pt]">
                  {children}
                </table>
              </div>
            ),
            thead: ({ children }) => (
              <thead className="bg-gray-100 border-t border-b border-gray-400">
                {children}
              </thead>
            ),
            th: ({ children }) => (
              <th className="px-2 py-1 text-left font-bold text-[9pt]">
                {children}
              </th>
            ),
            td: ({ children }) => (
              <td className="px-2 py-1 border-b border-gray-200 text-[9pt]">
                {children}
              </td>
            ),
            code: ({ children, className }) => {
              if (className?.includes('language-')) {
                return (
                  <pre className="bg-gray-100 p-2 rounded text-[8pt] overflow-x-auto my-2">
                    <code>{children}</code>
                  </pre>
                );
              }
              return (
                <code className="text-[9pt] text-blue-800 bg-blue-50 px-1 rounded">
                  {children}
                </code>
              );
            },
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    </div>
  );
}
