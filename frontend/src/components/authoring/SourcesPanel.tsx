

import { useState, useCallback } from 'react';
import {
  BookOpen, Layers, Table2, BarChart3, FileText, ExternalLink,
  Link2, Plus, Check, X, ChevronDown, ChevronRight, Eye,
  RefreshCw, AlertTriangle, CheckCircle, Search
} from 'lucide-react';
import { useAuthoringStore, SourceDocument } from '@/store/useAuthoringStore';
import { useCrossDocumentStore } from '@/store/useCrossDocumentStore';
import { AuthoringDocument, DocumentSection } from '@/types/authoring';

interface SourcesPanelProps {
  document: AuthoringDocument;
  selectedSection?: DocumentSection;
  onInsertTFL?: (tfl: TFLReference) => void;
  onViewSource?: (source: SourceDocument) => void;
}

export interface TFLReference {
  id: string;
  type: 'table' | 'figure' | 'listing';
  number: string;
  title: string;
  status: 'available' | 'linked' | 'pending' | 'outdated';
  lastUpdated?: string;
  sourceId?: string;
}

// Mock TFLs - in production would come from Biostatistics
const mockTFLs: TFLReference[] = [
  { id: 'tfl-1', type: 'table', number: '11.1', title: 'Overall Survival Analysis (ITT Population)', status: 'linked', lastUpdated: '2024-12-10' },
  { id: 'tfl-2', type: 'table', number: '11.2', title: 'Secondary Endpoints Summary', status: 'linked', lastUpdated: '2024-12-10' },
  { id: 'tfl-3', type: 'table', number: '11.3', title: 'Subgroup Analysis - OS by Baseline Characteristics', status: 'available', lastUpdated: '2024-12-08' },
  { id: 'tfl-4', type: 'figure', number: '11.1', title: 'Kaplan-Meier Plot - Overall Survival', status: 'pending' },
  { id: 'tfl-5', type: 'figure', number: '11.2', title: 'Forest Plot - Subgroup Analysis', status: 'available', lastUpdated: '2024-12-09' },
  { id: 'tfl-6', type: 'table', number: '12.1', title: 'Overview of Adverse Events', status: 'linked', lastUpdated: '2024-12-11' },
  { id: 'tfl-7', type: 'table', number: '12.2', title: 'TEAEs by System Organ Class', status: 'outdated', lastUpdated: '2024-11-15' },
  { id: 'tfl-8', type: 'listing', number: '12.1', title: 'Subject Narratives - Deaths', status: 'linked', lastUpdated: '2024-12-10' },
  { id: 'tfl-9', type: 'listing', number: '12.2', title: 'Subject Narratives - SAEs', status: 'available', lastUpdated: '2024-12-09' },
];

export function SourcesPanel({
  document,
  selectedSection,
  onInsertTFL,
  onViewSource,
}: SourcesPanelProps) {
  const availableSources = useAuthoringStore(s => s.availableSources);
  const selectedSourceIds = useAuthoringStore(s => s.selectedSourceIds);
  const toggleSourceSelection = useAuthoringStore(s => s.toggleSourceSelection);
  const getInboundLinks = useCrossDocumentStore(s => s.getInboundLinks);
  const getPendingUpdatesForDocument = useCrossDocumentStore(s => s.getPendingUpdatesForDocument);
  
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set()); // v0.124.9: collapsed by default
  const [tflFilter, setTflFilter] = useState<'all' | 'table' | 'figure' | 'listing'>('all');
  const [showLinkedOnly, setShowLinkedOnly] = useState(false);
  const [sourceSearch, setSourceSearch] = useState(''); // v0.124.9: search across TFLs + sources
  const [insertedTFLId, setInsertedTFLId] = useState<string | null>(null); // v0.124.10: insert confirmation
  
  // Get cross-document updates
  const pendingUpdates = getPendingUpdatesForDocument(document.id);
  const inboundLinks = getInboundLinks(document.id);
  
  // Filter TFLs
  const filteredTFLs = mockTFLs.filter(tfl => {
    if (tflFilter !== 'all' && tfl.type !== tflFilter) return false;
    if (showLinkedOnly && tfl.status !== 'linked') return false;
    if (sourceSearch && !tfl.title.toLowerCase().includes(sourceSearch.toLowerCase()) && !tfl.number.includes(sourceSearch)) return false;
    if (selectedSection) {
      const sectionNum = selectedSection.number.split('.')[0];
      const tflSectionNum = tfl.number.split('.')[0];
      if (tflSectionNum !== sectionNum && tfl.status !== 'linked') return false;
    }
    return true;
  });

  const filteredSources = availableSources.filter(src =>
    !sourceSearch ||
    src.title.toLowerCase().includes(sourceSearch.toLowerCase()) ||
    src.type.toLowerCase().includes(sourceSearch.toLowerCase())
  );
  
  // Group TFLs by type
  const tables = filteredTFLs.filter(t => t.type === 'table');
  const figures = filteredTFLs.filter(t => t.type === 'figure');
  const listings = filteredTFLs.filter(t => t.type === 'listing');
  
  const toggleGroup = (group: string) => {
    const next = new Set(expandedGroups);
    if (next.has(group)) {
      next.delete(group);
    } else {
      next.add(group);
    }
    setExpandedGroups(next);
  };
  
  const getTFLStatusBadge = (status: TFLReference['status']) => {
    switch (status) {
      case 'linked':
        return <span className="text-xs px-1.5 py-0.5 rounded bg-accent-green/20 text-accent-green flex items-center gap-1"><CheckCircle className="w-3 h-3" />Linked</span>;
      case 'available':
        return <span className="text-xs px-1.5 py-0.5 rounded bg-accent-blue/20 text-accent-blue">Available</span>;
      case 'pending':
        return <span className="text-xs px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400">Pending</span>;
      case 'outdated':
        return <span className="text-xs px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />Outdated</span>;
    }
  };
  
  const getTFLIcon = (type: TFLReference['type']) => {
    switch (type) {
      case 'table': return <Table2 className="w-4 h-4 text-accent-blue" />;
      case 'figure': return <BarChart3 className="w-4 h-4 text-purple-400" />;
      case 'listing': return <FileText className="w-4 h-4 text-amber-400" />;
    }
  };
  
  const handleInsertTFL = (tfl: TFLReference) => {
    onInsertTFL?.(tfl);
    setInsertedTFLId(tfl.id);
    setTimeout(() => setInsertedTFLId(null), 2500);
  };
  
  return (
    <div className="space-y-3">
      {/* v0.124.10: Purpose header — tells user exactly what this panel is for */}
      <div className="px-1 pb-1 border-b border-border">
        <p className="text-xs text-text-muted leading-snug">
          {selectedSection
            ? <>Editing <span className="font-medium text-text-primary">§{selectedSection.number} {selectedSection.title}</span> — insert TFLs or select sources for AI generation.</>
            : <>Select a section to edit, then insert TFLs or pick sources for AI generation.</>
          }
        </p>
      </div>

      {/* Search bar */}
      <div className="relative">
        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
        <input
          type="text"
          placeholder="Search TFLs & sources…"
          value={sourceSearch}
          onChange={e => setSourceSearch(e.target.value)}
          className="w-full pl-8 pr-3 py-1.5 text-xs bg-surface-card border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent-blue/40"
        />
        {sourceSearch && (
          <button onClick={() => setSourceSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary">
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Cross-Document Updates Alert */}
      {pendingUpdates.length > 0 && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-medium text-amber-400">Source Updates Available</span>
          </div>
          <p className="text-xs text-text-muted mb-2">
            {pendingUpdates.length} source document{pendingUpdates.length > 1 ? 's have' : ' has'} been updated.
          </p>
          <button className="text-xs text-amber-400 hover:underline">
            Review updates →
          </button>
        </div>
      )}
      
      {/* TFLs Section */}
      <div>
        <button
          onClick={() => toggleGroup('tfls')}
          className="w-full flex items-center justify-between py-2 text-sm font-medium text-text-primary hover:text-accent-blue transition-colors"
        >
          <div className="flex items-center gap-2">
            {expandedGroups.has('tfls') ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            <Layers className="w-4 h-4 text-purple-400" />
            Tables, Figures & Listings
          </div>
          <div className="flex items-center gap-2">
            {!expandedGroups.has('tfls') && (
              <span className="text-xs text-text-muted">
                {mockTFLs.filter(t => t.status === 'linked').length} linked · {mockTFLs.filter(t => t.status === 'available').length} available
              </span>
            )}
            <span className="text-xs bg-surface-card border border-border rounded-full px-1.5 py-0.5 text-text-muted">{filteredTFLs.length}</span>
          </div>
        </button>
        
        {expandedGroups.has('tfls') && (
          <div className="mt-2 space-y-3">
            {/* TFL Filter */}
            <div className="flex items-center gap-2">
              {(['all', 'table', 'figure', 'listing'] as const).map(type => (
                <button
                  key={type}
                  onClick={() => setTflFilter(type)}
                  className={`text-xs px-2 py-1 rounded transition-colors ${
                    tflFilter === type
                      ? 'bg-accent-blue text-white'
                      : 'bg-surface-card text-text-muted hover:text-text-primary'
                  }`}
                >
                  {type === 'all' ? 'All' : type.charAt(0).toUpperCase() + type.slice(1) + 's'}
                </button>
              ))}
            </div>
            
            {/* TFL List */}
            <div className="space-y-2 max-h-64 overflow-auto">
              {filteredTFLs.map(tfl => (
                <div
                  key={tfl.id}
                  className="p-2 bg-surface-card rounded-lg border border-border hover:border-accent-blue/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-2">
                      {getTFLIcon(tfl.type)}
                      <div>
                        <div className="text-xs font-medium text-text-primary">
                          {tfl.type === 'table' ? 'Table' : tfl.type === 'figure' ? 'Figure' : 'Listing'} {tfl.number}
                        </div>
                        <div className="text-xs text-text-muted line-clamp-1">{tfl.title}</div>
                      </div>
                    </div>
                    {getTFLStatusBadge(tfl.status)}
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    {tfl.lastUpdated && (
                      <span className="text-xs text-text-muted">Updated {tfl.lastUpdated}</span>
                    )}
                    <div className="flex items-center gap-2">
                      <button className="text-xs text-accent-blue hover:underline flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        View
                      </button>
                      {tfl.status !== 'pending' && (
                        insertedTFLId === tfl.id ? (
                          <span className="text-xs px-2 py-0.5 bg-accent-green/20 text-accent-green rounded flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            Inserted ✓
                          </span>
                        ) : (
                          <button
                            onClick={() => handleInsertTFL(tfl)}
                            className="text-xs px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded hover:bg-purple-500/30"
                            title={selectedSection ? `Insert into §${selectedSection.number}` : 'Select a section first'}
                          >
                            {selectedSection ? `Insert into §${selectedSection.number}` : 'Insert'}
                          </button>
                        )
                      )}
                    </div>
                  </div>
                </div>
              ))}
              
              {filteredTFLs.length === 0 && (
                <div className="text-center py-4 text-text-muted">
                  <Layers className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-xs">No TFLs found</p>
                </div>
              )}
            </div>
            
            <button className="w-full py-1.5 text-xs bg-purple-500/10 text-purple-400 rounded hover:bg-purple-500/20 flex items-center justify-center gap-1">
              <Plus className="w-3 h-3" />
              Request New TFL
            </button>
          </div>
        )}
      </div>
      
      {/* Source Documents Section */}
      <div>
        <button
          onClick={() => toggleGroup('sources')}
          className="w-full flex items-center justify-between py-2 text-sm font-medium text-text-primary hover:text-accent-blue transition-colors"
        >
          <div className="flex items-start gap-2">
            {expandedGroups.has('sources') ? <ChevronDown className="w-4 h-4 mt-0.5" /> : <ChevronRight className="w-4 h-4 mt-0.5" />}
            <BookOpen className="w-4 h-4 text-accent-blue mt-0.5" />
            <div className="text-left">
              <div>Source Documents</div>
              <div className="text-xs font-normal text-text-muted">Check to include in AI generation</div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {!expandedGroups.has('sources') && (
              <span className="text-xs text-text-muted">
                {selectedSourceIds.size} selected
              </span>
            )}
            <span className="text-xs bg-surface-card border border-border rounded-full px-1.5 py-0.5 text-text-muted">{filteredSources.length}</span>
          </div>
        </button>
        
        {expandedGroups.has('sources') && (
          <div className="mt-2 space-y-2">
            {filteredSources.map(source => {
              const isSelected = selectedSourceIds.has(source.id);
              return (
                <div
                  key={source.id}
                  className={`p-3 rounded-lg border transition-colors cursor-pointer ${
                    isSelected
                      ? 'border-accent-blue bg-accent-blue/10'
                      : 'border-border bg-surface-card hover:border-accent-blue/50'
                  }`}
                  onClick={() => toggleSourceSelection(source.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-2">
                      <div className={`mt-0.5 w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                        isSelected ? 'border-accent-blue bg-accent-blue' : 'border-border'
                      }`}>
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-text-primary truncate">
                          {source.title.split(' - ')[0]}
                        </div>
                        <div className="text-xs text-text-muted">
                          {source.type.replace(/-/g, ' ')} • v{source.version}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewSource?.(source);
                      }}
                      className="text-accent-blue hover:text-accent-blue/80"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  </div>
                  {source.sections && source.sections.length > 0 && (
                    <div className="mt-2 pl-6 text-xs text-accent-blue">
                      {source.sections.length} sections available
                    </div>
                  )}
                </div>
              );
            })}
            
            {filteredSources.length === 0 && (
              <div className="text-center py-4 text-text-muted">
                <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-xs">No source documents found</p>
              </div>
            )}
            
            <button className="w-full py-1.5 text-xs bg-accent-blue/10 text-accent-blue rounded hover:bg-accent-blue/20 flex items-center justify-center gap-1">
              <Link2 className="w-3 h-3" />
              Link More Documents
            </button>
          </div>
        )}
      </div>
      
      {/* Inbound Links Section */}
      {inboundLinks.length > 0 && (
        <div>
          <button
            onClick={() => toggleGroup('links')}
            className="w-full flex items-center justify-between py-2 text-sm font-medium text-text-primary"
          >
            <div className="flex items-center gap-2">
              {expandedGroups.has('links') ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              <Link2 className="w-4 h-4 text-accent-green" />
              Content Links
            </div>
            <span className="text-xs text-text-muted">{inboundLinks.length}</span>
          </button>
          
          {expandedGroups.has('links') && (
            <div className="mt-2 space-y-2">
              {inboundLinks.map(link => (
                <div key={link.id} className="p-2 bg-surface-card rounded border border-border">
                  <div className="text-xs font-medium text-text-primary">{link.sourceDocumentTitle}</div>
                  {link.sourceSectionNumber && (
                    <div className="text-xs text-text-muted">Section {link.sourceSectionNumber}</div>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      link.status === 'current' ? 'bg-accent-green/20 text-accent-green' :
                      link.status === 'source-updated' ? 'bg-amber-500/20 text-amber-400' :
                      'bg-surface text-text-muted'
                    }`}>
                      {link.status.replace(/-/g, ' ')}
                    </span>
                    <span className="text-xs text-text-muted">{link.linkType.replace(/-/g, ' ')}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
