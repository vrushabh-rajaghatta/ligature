

import React, { useState, useMemo, useCallback } from 'react';
import {
  BookOpen,
  FileText,
  Table2,
  Image,
  Link2,
  ExternalLink,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  Edit2,
  Eye,
  RefreshCw,
  Search,
  Filter,
  Copy,
  Check,
  Hash,
  List,
  Settings,
  Download,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { SearchInput } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { CollapsibleSection } from '@/components/ui/CollapsibleSection';
import {
  Citation,
  CrossReference,
  TFLReference,
  BibliographyEntry,
  CitationSourceType,
  CitationStyle,
  CitationPanelView,
  ResolvedCitation,
  ValidationSummary,
  formatBibliographyEntry,
} from '@/types/citation';

// ============================================================================
// TYPES
// ============================================================================

export interface CitationPanelProps {
  /** Current document ID */
  documentId: string;
  /** All citations in document */
  citations: ResolvedCitation[];
  /** Cross-references */
  crossReferences: CrossReference[];
  /** TFL references */
  tflReferences: TFLReference[];
  /** Bibliography entries */
  bibliography: BibliographyEntry[];
  /** Current citation style */
  style: CitationStyle;
  /** Validation summary */
  validationSummary?: ValidationSummary;
  /** Current section ID for filtering */
  currentSectionId?: string;
  /** Callback when citation is clicked */
  onCitationClick?: (citation: Citation) => void;
  /** Callback when citation is edited */
  onEditCitation?: (citationId: string) => void;
  /** Callback when citation is deleted */
  onDeleteCitation?: (citationId: string) => void;
  /** Callback when cross-ref is clicked */
  onCrossRefClick?: (crossRef: CrossReference) => void;
  /** Callback to navigate to TFL */
  onNavigateToTFL?: (tfl: TFLReference) => void;
  /** Callback when bibliography entry is edited */
  onEditBibEntry?: (entryId: string) => void;
  /** Callback when validation is requested */
  onValidate?: () => void;
  /** Callback when style is changed */
  onStyleChange?: (style: CitationStyle) => void;
  /** Callback to add new bibliography entry */
  onAddBibEntry?: () => void;
  /** Callback to export bibliography */
  onExportBibliography?: (format: 'text' | 'bibtex' | 'ris') => void;
  /** Class name */
  className?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const SOURCE_TYPE_ICONS: Record<CitationSourceType, React.ReactNode> = {
  source_document: <FileText className="w-4 h-4" />,
  literature: <BookOpen className="w-4 h-4" />,
  table: <Table2 className="w-4 h-4" />,
  figure: <Image className="w-4 h-4" />,
  listing: <List className="w-4 h-4" />,
  section: <Link2 className="w-4 h-4" />,
  appendix: <FileText className="w-4 h-4" />,
  external: <ExternalLink className="w-4 h-4" />,
};

const VERIFICATION_STATUS_CONFIG: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  valid: { icon: <CheckCircle className="w-3.5 h-3.5" />, color: 'green', label: 'Valid' },
  broken: { icon: <XCircle className="w-3.5 h-3.5" />, color: 'red', label: 'Broken' },
  outdated: { icon: <AlertTriangle className="w-3.5 h-3.5" />, color: 'amber', label: 'Outdated' },
  pending: { icon: <Clock className="w-3.5 h-3.5" />, color: 'gray', label: 'Pending' },
};

const CITATION_STYLES: { value: CitationStyle; label: string }[] = [
  { value: 'numeric', label: '[1] Numeric' },
  { value: 'superscript', label: '¹ Superscript' },
  { value: 'author_year', label: '(Author, Year)' },
  { value: 'ama', label: 'AMA Style' },
  { value: 'vancouver', label: 'Vancouver' },
];

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

const VerificationBadge: React.FC<{ status?: string }> = ({ status }) => {
  const config = VERIFICATION_STATUS_CONFIG[status || 'pending'];
  const colorClasses: Record<string, string> = {
    green: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    red: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    amber: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    gray: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  };
  
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${colorClasses[config.color]}`}>
      {config.icon}
      {config.label}
    </span>
  );
};

const ValidationSummaryCard: React.FC<{ summary: ValidationSummary; onValidate?: () => void }> = ({ 
  summary, 
  onValidate 
}) => {
  const hasIssues = summary.brokenCitations > 0 || 
    summary.outdatedCitations > 0 || 
    summary.brokenCrossRefs > 0 ||
    summary.missingTFLs.length > 0;
  
  return (
    <div className={`p-3 rounded-lg border ${
      hasIssues 
        ? 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-700' 
        : 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-700'
    }`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {hasIssues ? (
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          ) : (
            <CheckCircle className="w-4 h-4 text-green-600" />
          )}
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            {hasIssues ? 'Issues Found' : 'All Valid'}
          </span>
        </div>
        <Button variant="outline" size="sm" onClick={onValidate}>
          <RefreshCw className="w-3.5 h-3.5 mr-1" />
          Re-validate
        </Button>
      </div>
      
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="flex justify-between">
          <span className="text-gray-500">Citations:</span>
          <span className="font-medium">{summary.validCitations}/{summary.totalCitations}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Cross-refs:</span>
          <span className="font-medium">{summary.validCrossRefs}/{summary.totalCrossRefs}</span>
        </div>
        {summary.brokenCitations > 0 && (
          <div className="flex justify-between text-red-600">
            <span>Broken:</span>
            <span className="font-medium">{summary.brokenCitations}</span>
          </div>
        )}
        {summary.pendingVerification > 0 && (
          <div className="flex justify-between text-gray-500">
            <span>Pending:</span>
            <span className="font-medium">{summary.pendingVerification}</span>
          </div>
        )}
      </div>
      
      {summary.missingTFLs.length > 0 && (
        <div className="mt-2 text-xs text-amber-700 dark:text-amber-400">
          Missing TFLs: {summary.missingTFLs.join(', ')}
        </div>
      )}
    </div>
  );
};

const CitationCard: React.FC<{
  citation: ResolvedCitation;
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}> = ({ citation, onClick, onEdit, onDelete }) => {
  const [showExcerpt, setShowExcerpt] = useState(false);
  
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 hover:border-gray-300 dark:hover:border-gray-600 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-2 flex-1 min-w-0">
          <span className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-sm font-medium text-blue-700 dark:text-blue-400">
            {citation.key}
          </span>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {SOURCE_TYPE_ICONS[citation.type]}
              <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {citation.sourceName || citation.type}
              </span>
              <VerificationBadge status={citation.verificationStatus} />
            </div>
            
            {citation.sectionTitle && (
              <div className="text-xs text-gray-500 mt-1">
                In: {citation.sectionTitle}
              </div>
            )}
            
            {citation.sourceRef.pageNumbers && citation.sourceRef.pageNumbers.length > 0 && (
              <div className="text-xs text-gray-500 mt-0.5">
                Page{citation.sourceRef.pageNumbers.length > 1 ? 's' : ''}: {citation.sourceRef.pageNumbers.join(', ')}
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-1 flex-shrink-0">
          {citation.fullExcerpt && (
            <button
              onClick={() => setShowExcerpt(!showExcerpt)}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              title="View excerpt"
            >
              <Eye className="w-4 h-4 text-gray-400" />
            </button>
          )}
          <button
            onClick={onEdit}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            title="Edit"
          >
            <Edit2 className="w-4 h-4 text-gray-400" />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
            title="Delete"
          >
            <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-500" />
          </button>
        </div>
      </div>
      
      {/* Excerpt */}
      {showExcerpt && citation.fullExcerpt && (
        <div className="mt-3 p-2 bg-gray-50 dark:bg-gray-800 rounded text-xs text-gray-600 dark:text-gray-400 italic">
          "{citation.fullExcerpt}"
        </div>
      )}
    </div>
  );
};

const CrossRefCard: React.FC<{
  crossRef: CrossReference;
  onClick?: () => void;
}> = ({ crossRef, onClick }) => {
  const statusColor: Record<string, string> = {
    valid: 'text-green-600 dark:text-green-400',
    broken: 'text-red-600 dark:text-red-400',
    target_moved: 'text-amber-600 dark:text-amber-400',
    target_deleted: 'text-red-600 dark:text-red-400',
  };
  
  return (
    <button
      onClick={onClick}
      className="w-full text-left border border-gray-200 dark:border-gray-700 rounded-lg p-3 
        hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link2 className="w-4 h-4 text-blue-500" />
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            {crossRef.referenceText}
          </span>
        </div>
        
        <span className={`text-xs ${statusColor[crossRef.status]}`}>
          {crossRef.status === 'valid' ? '✓' : crossRef.status === 'target_moved' ? '⚠' : '✗'}
        </span>
      </div>
      
      <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
        <span>→</span>
        <span>{crossRef.targetTitle || crossRef.targetNumber}</span>
      </div>
    </button>
  );
};

const TFLCard: React.FC<{
  tfl: TFLReference;
  onNavigate?: () => void;
}> = ({ tfl, onNavigate }) => {
  const typeIcons = {
    table: <Table2 className="w-4 h-4" />,
    figure: <Image className="w-4 h-4" />,
    listing: <List className="w-4 h-4" />,
  };
  
  const typeColors = {
    table: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    figure: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    listing: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  };
  
  return (
    <button
      onClick={onNavigate}
      className="w-full text-left border border-gray-200 dark:border-gray-700 rounded-lg p-3 
        hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`p-1 rounded ${typeColors[tfl.type]}`}>
            {typeIcons[tfl.type]}
          </span>
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            {tfl.type.charAt(0).toUpperCase() + tfl.type.slice(1)} {tfl.number}
          </span>
        </div>
        
        <Badge color={tfl.status === 'defined' ? 'green' : tfl.status === 'pending' ? 'amber' : 'gray'}>
          {tfl.status}
        </Badge>
      </div>
      
      <div className="text-xs text-gray-600 dark:text-gray-400 mt-1 truncate">
        {tfl.title}
      </div>
      
      {tfl.referencedInSections.length > 0 && (
        <div className="text-xs text-gray-500 mt-1">
          Referenced in {tfl.referencedInSections.length} section(s)
        </div>
      )}
    </button>
  );
};

const BibliographyCard: React.FC<{
  entry: BibliographyEntry;
  number: number;
  style: CitationStyle;
  onEdit?: () => void;
}> = ({ entry, number, style, onEdit }) => {
  const [copied, setCopied] = useState(false);
  
  const formattedEntry = formatBibliographyEntry(entry, style);
  
  const handleCopy = () => {
    navigator.clipboard.writeText(formattedEntry);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
      <div className="flex items-start gap-3">
        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-xs font-medium text-gray-600 dark:text-gray-400">
          {number}
        </span>
        
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-900 dark:text-white">
            {formattedEntry}
          </p>
          
          <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
            {entry.doi && (
              <a 
                href={`https://doi.org/${entry.doi}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                DOI
              </a>
            )}
            {entry.pmid && (
              <a 
                href={`https://pubmed.ncbi.nlm.nih.gov/${entry.pmid}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                PubMed
              </a>
            )}
            <span>Cited {entry.citationCount}×</span>
          </div>
        </div>
        
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={handleCopy}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            title="Copy"
          >
            {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-gray-400" />}
          </button>
          <button
            onClick={onEdit}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            title="Edit"
          >
            <Edit2 className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function CitationPanel({
  documentId,
  citations,
  crossReferences,
  tflReferences,
  bibliography,
  style,
  validationSummary,
  currentSectionId,
  onCitationClick,
  onEditCitation,
  onDeleteCitation,
  onCrossRefClick,
  onNavigateToTFL,
  onEditBibEntry,
  onValidate,
  onStyleChange,
  onAddBibEntry,
  onExportBibliography,
  className = '',
}: CitationPanelProps) {
  const [activeView, setActiveView] = useState<CitationPanelView>('citations');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCurrentSectionOnly, setShowCurrentSectionOnly] = useState(false);
  const [showStyleSettings, setShowStyleSettings] = useState(false);
  
  // Filter citations
  const filteredCitations = useMemo(() => {
    let result = citations;
    
    if (showCurrentSectionOnly && currentSectionId) {
      result = result.filter(c => c.position.sectionId === currentSectionId);
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(c => 
        c.sourceName?.toLowerCase().includes(query) ||
        c.sectionTitle?.toLowerCase().includes(query) ||
        c.fullExcerpt?.toLowerCase().includes(query)
      );
    }
    
    return result;
  }, [citations, showCurrentSectionOnly, currentSectionId, searchQuery]);
  
  // Filter cross-refs
  const filteredCrossRefs = useMemo(() => {
    let result = crossReferences;
    
    if (showCurrentSectionOnly && currentSectionId) {
      result = result.filter(c => c.fromSectionId === currentSectionId);
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(c => 
        c.referenceText.toLowerCase().includes(query) ||
        c.targetTitle?.toLowerCase().includes(query)
      );
    }
    
    return result;
  }, [crossReferences, showCurrentSectionOnly, currentSectionId, searchQuery]);
  
  // Filter TFLs
  const filteredTFLs = useMemo(() => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return tflReferences.filter(t => 
        t.number.toLowerCase().includes(query) ||
        t.title.toLowerCase().includes(query)
      );
    }
    return tflReferences;
  }, [tflReferences, searchQuery]);
  
  // Filter bibliography
  const filteredBibliography = useMemo(() => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return bibliography.filter(b => 
        b.title.toLowerCase().includes(query) ||
        b.authors.some(a => a.lastName.toLowerCase().includes(query))
      );
    }
    return bibliography;
  }, [bibliography, searchQuery]);
  
  // Group TFLs by type
  const groupedTFLs = useMemo(() => {
    return {
      table: filteredTFLs.filter(t => t.type === 'table'),
      figure: filteredTFLs.filter(t => t.type === 'figure'),
      listing: filteredTFLs.filter(t => t.type === 'listing'),
    };
  }, [filteredTFLs]);

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Citations & References
        </h3>
        <button
          onClick={() => setShowStyleSettings(true)}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          title="Citation settings"
        >
          <Settings className="w-4 h-4 text-gray-500" />
        </button>
      </div>
      
      {/* Validation Summary */}
      {validationSummary && (
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <ValidationSummaryCard summary={validationSummary} onValidate={onValidate} />
        </div>
      )}
      
      {/* Search & Filter */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <SearchInput
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search..."
            className="flex-1"
          />
          {currentSectionId && (
            <button
              onClick={() => setShowCurrentSectionOnly(!showCurrentSectionOnly)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors
                ${showCurrentSectionOnly
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                  : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                }`}
            >
              Current Section
            </button>
          )}
        </div>
      </div>
      
      {/* Tabs */}
      <Tabs value={activeView} onValueChange={(v) => setActiveView(v as CitationPanelView)} className="flex-1 flex flex-col min-h-0">
        <TabsList className="px-4 border-b border-gray-200 dark:border-gray-700">
          <TabsTrigger value="citations" className="flex items-center gap-1.5">
            <Hash className="w-3.5 h-3.5" />
            Citations
            <Badge color="gray" className="ml-1">{citations.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="crossrefs" className="flex items-center gap-1.5">
            <Link2 className="w-3.5 h-3.5" />
            Cross-refs
            <Badge color="gray" className="ml-1">{crossReferences.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="tfls" className="flex items-center gap-1.5">
            <Table2 className="w-3.5 h-3.5" />
            TFLs
            <Badge color="gray" className="ml-1">{tflReferences.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="bibliography" className="flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5" />
            Bibliography
            <Badge color="gray" className="ml-1">{bibliography.length}</Badge>
          </TabsTrigger>
        </TabsList>
        
        {/* Citations Tab */}
        <TabsContent value="citations" className="flex-1 overflow-y-auto p-4">
          {filteredCitations.length > 0 ? (
            <div className="space-y-2">
              {filteredCitations.map(citation => (
                <CitationCard
                  key={citation.id}
                  citation={citation}
                  onClick={() => onCitationClick?.(citation)}
                  onEdit={() => onEditCitation?.(citation.id)}
                  onDelete={() => onDeleteCitation?.(citation.id)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              {citations.length === 0 ? 'No citations yet' : 'No matching citations'}
            </div>
          )}
        </TabsContent>
        
        {/* Cross-refs Tab */}
        <TabsContent value="crossrefs" className="flex-1 overflow-y-auto p-4">
          {filteredCrossRefs.length > 0 ? (
            <div className="space-y-2">
              {filteredCrossRefs.map(crossRef => (
                <CrossRefCard
                  key={crossRef.id}
                  crossRef={crossRef}
                  onClick={() => onCrossRefClick?.(crossRef)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              {crossReferences.length === 0 ? 'No cross-references' : 'No matching cross-references'}
            </div>
          )}
        </TabsContent>
        
        {/* TFLs Tab */}
        <TabsContent value="tfls" className="flex-1 overflow-y-auto p-4">
          {filteredTFLs.length > 0 ? (
            <div className="space-y-4">
              {groupedTFLs.table.length > 0 && (
                <CollapsibleSection 
                  title="Tables" 
                  icon={<Table2 className="w-4 h-4" />}
                  count={groupedTFLs.table.length}
                  defaultExpanded
                >
                  <div className="space-y-2">
                    {groupedTFLs.table.map(tfl => (
                      <TFLCard
                        key={tfl.id}
                        tfl={tfl}
                        onNavigate={() => onNavigateToTFL?.(tfl)}
                      />
                    ))}
                  </div>
                </CollapsibleSection>
              )}
              
              {groupedTFLs.figure.length > 0 && (
                <CollapsibleSection 
                  title="Figures" 
                  icon={<Image className="w-4 h-4" />}
                  count={groupedTFLs.figure.length}
                  defaultExpanded
                >
                  <div className="space-y-2">
                    {groupedTFLs.figure.map(tfl => (
                      <TFLCard
                        key={tfl.id}
                        tfl={tfl}
                        onNavigate={() => onNavigateToTFL?.(tfl)}
                      />
                    ))}
                  </div>
                </CollapsibleSection>
              )}
              
              {groupedTFLs.listing.length > 0 && (
                <CollapsibleSection 
                  title="Listings" 
                  icon={<List className="w-4 h-4" />}
                  count={groupedTFLs.listing.length}
                  defaultExpanded
                >
                  <div className="space-y-2">
                    {groupedTFLs.listing.map(tfl => (
                      <TFLCard
                        key={tfl.id}
                        tfl={tfl}
                        onNavigate={() => onNavigateToTFL?.(tfl)}
                      />
                    ))}
                  </div>
                </CollapsibleSection>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              {tflReferences.length === 0 ? 'No TFL references' : 'No matching TFLs'}
            </div>
          )}
        </TabsContent>
        
        {/* Bibliography Tab */}
        <TabsContent value="bibliography" className="flex-1 overflow-y-auto p-4">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-gray-500">
              {bibliography.filter(b => b.citationCount > 0).length} cited references
            </span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={onAddBibEntry}>
                <Plus className="w-4 h-4 mr-1" />
                Add
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => onExportBibliography?.('text')}
              >
                <Download className="w-4 h-4 mr-1" />
                Export
              </Button>
            </div>
          </div>
          
          {filteredBibliography.length > 0 ? (
            <div className="space-y-2">
              {filteredBibliography.map((entry, index) => (
                <BibliographyCard
                  key={entry.id}
                  entry={entry}
                  number={index + 1}
                  style={style}
                  onEdit={() => onEditBibEntry?.(entry.id)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              {bibliography.length === 0 ? 'No bibliography entries' : 'No matching entries'}
            </div>
          )}
        </TabsContent>
      </Tabs>
      
      {/* Style Settings Modal */}
      <Modal
        isOpen={showStyleSettings}
        onClose={() => setShowStyleSettings(false)}
        title="Citation Style"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Select the citation style for this document.
          </p>
          
          <div className="space-y-2">
            {CITATION_STYLES.map(s => (
              <button
                key={s.value}
                onClick={() => {
                  onStyleChange?.(s.value);
                  setShowStyleSettings(false);
                }}
                className={`w-full text-left px-4 py-3 rounded-lg border transition-colors
                  ${s.value === style
                    ? 'border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                  }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-900 dark:text-white">
                    {s.label}
                  </span>
                  {s.value === style && <Check className="w-4 h-4 text-blue-500" />}
                </div>
              </button>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default CitationPanel;
