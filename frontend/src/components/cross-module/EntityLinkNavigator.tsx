

/**
 * Entity Link Navigator
 * 
 * Shows cross-module entity relationships and allows navigation
 * between linked entities across different modules.
 * 
 * @module components/cross-module/EntityLinkNavigator
 * @version 0.27.46
 */

import { useState, useMemo } from 'react';
import {
  Link2, ArrowRight, ArrowLeftRight, ExternalLink, Trash2,
  FileText, Shield, Activity, Beaker, FlaskConical, BookOpen, Send,
  Database, Archive, BarChart3, ClipboardList, FolderOpen, FileQuestion,
  Layers, Microscope, TestTube, Building2, Package, CheckCircle2,
  ChevronDown, ChevronRight, Plus, Search, Filter, XCircle, AlertTriangle,
  Sparkles,
  ClipboardCheck,
} from 'lucide-react';
import {
  useCrossModuleStore,
  useEntityLinks,
  type ModuleType,
  type SharedEntityType,
  type EntityLink,
  type EntityReference,
  MODULE_LABELS,
  MODULE_SHORT_LABELS,
  createEntityReference,
} from '@/store/useCrossModuleStore';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

// =============================================================================
// MODULE ICONS & COLORS
// =============================================================================

const MODULE_METADATA: Record<ModuleType, { icon: React.ComponentType<{ className?: string }>; color: string; bgColor: string }> = {
  authoring: { icon: BookOpen, color: 'text-indigo-400', bgColor: 'bg-indigo-500/20' },
  haq: { icon: FileQuestion, color: 'text-amber-400', bgColor: 'bg-amber-500/20' },
  submissions: { icon: Send, color: 'text-green-400', bgColor: 'bg-green-500/20' },
  regulatory: { icon: FileText, color: 'text-cyan-400', bgColor: 'bg-cyan-500/20' },
  labeling: { icon: Package, color: 'text-teal-400', bgColor: 'bg-teal-500/20' },
  ctms: { icon: Activity, color: 'text-blue-400', bgColor: 'bg-blue-500/20' },
  tmf: { icon: FolderOpen, color: 'text-violet-400', bgColor: 'bg-violet-500/20' },
  edc: { icon: Database, color: 'text-sky-400', bgColor: 'bg-sky-500/20' },
  safety: { icon: Shield, color: 'text-red-400', bgColor: 'bg-red-500/20' },
  quality: { icon: CheckCircle2, color: 'text-orange-400', bgColor: 'bg-orange-500/20' },
  psmf: { icon: ClipboardList, color: 'text-rose-400', bgColor: 'bg-rose-500/20' },
  eln: { icon: Microscope, color: 'text-purple-400', bgColor: 'bg-purple-500/20' },
  glp: { icon: FlaskConical, color: 'text-emerald-400', bgColor: 'bg-emerald-500/20' },
  'sample-management': { icon: TestTube, color: 'text-pink-400', bgColor: 'bg-pink-500/20' },
  idmp: { icon: Layers, color: 'text-lime-400', bgColor: 'bg-lime-500/20' },
  'master-data': { icon: Building2, color: 'text-slate-400', bgColor: 'bg-slate-500/20' },
  'study-intel': { icon: BarChart3, color: 'text-fuchsia-400', bgColor: 'bg-fuchsia-500/20' },
  archives: { icon: Archive, color: 'text-stone-400', bgColor: 'bg-stone-500/20' },
  'document-control': { icon: FileText, color: 'text-slate-400', bgColor: 'bg-slate-500/20' },
  qms: { icon: Shield, color: 'text-emerald-400', bgColor: 'bg-emerald-500/20' },
  audit: { icon: ClipboardCheck, color: 'text-teal-400', bgColor: 'bg-teal-500/20' },
  executive: { icon: BarChart3, color: 'text-violet-400', bgColor: 'bg-violet-500/20' },
};

// Entity type labels and icons
const ENTITY_TYPE_CONFIG: Record<SharedEntityType, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  study: { label: 'Study', icon: Activity },
  site: { label: 'Site', icon: Building2 },
  subject: { label: 'Subject', icon: FileText },
  visit: { label: 'Visit', icon: ClipboardList },
  document: { label: 'Document', icon: FileText },
  submission: { label: 'Submission', icon: Send },
  sequence: { label: 'Sequence', icon: Layers },
  case: { label: 'Safety Case', icon: Shield },
  signal: { label: 'Safety Signal', icon: AlertTriangle },
  product: { label: 'Product', icon: Package },
  substance: { label: 'Substance', icon: Beaker },
  experiment: { label: 'Experiment', icon: Microscope },
  sample: { label: 'Sample', icon: TestTube },
  'glp-study': { label: 'GLP Study', icon: FlaskConical },
  capa: { label: 'CAPA', icon: CheckCircle2 },
  deviation: { label: 'Deviation', icon: AlertTriangle },
  audit: { label: 'Audit', icon: ClipboardList },
};

// Link type styling
const LINK_TYPE_STYLES: Record<string, { label: string; color: string; bgColor: string }> = {
  'derived-from': { label: 'Derived From', color: 'text-blue-400', bgColor: 'bg-blue-500/20' },
  'supports': { label: 'Supports', color: 'text-green-400', bgColor: 'bg-green-500/20' },
  'related-to': { label: 'Related To', color: 'text-slate-400', bgColor: 'bg-slate-500/20' },
  'triggers': { label: 'Triggers', color: 'text-amber-400', bgColor: 'bg-amber-500/20' },
  'references': { label: 'References', color: 'text-purple-400', bgColor: 'bg-purple-500/20' },
  'supersedes': { label: 'Supersedes', color: 'text-red-400', bgColor: 'bg-red-500/20' },
  'part-of': { label: 'Part Of', color: 'text-cyan-400', bgColor: 'bg-cyan-500/20' },
};

// =============================================================================
// ENTITY REFERENCE CARD
// =============================================================================

interface EntityReferenceCardProps {
  reference: EntityReference;
  position: 'source' | 'target';
  onNavigate?: (ref: EntityReference) => void;
}

function EntityReferenceCard({ reference, position, onNavigate }: EntityReferenceCardProps) {
  const moduleConfig = MODULE_METADATA[reference.sourceModule];
  const entityConfig = ENTITY_TYPE_CONFIG[reference.entityType];
  const ModuleIcon = moduleConfig.icon;
  const EntityIcon = entityConfig.icon;
  
  return (
    <button
      onClick={() => onNavigate?.(reference)}
      disabled={!reference.valid}
      className={`flex-1 p-3 rounded-lg border transition-all text-left ${
        reference.valid
          ? 'border-slate-600 hover:border-slate-500 hover:bg-white/5 cursor-pointer'
          : 'border-red-500/30 bg-red-500/5 cursor-not-allowed opacity-60'
      }`}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <div className={`p-1 rounded ${moduleConfig.bgColor}`}>
          <ModuleIcon className={`w-3.5 h-3.5 ${moduleConfig?.color ?? ''}`} />
        </div>
        <span className="text-xs text-slate-400">{MODULE_SHORT_LABELS[reference.sourceModule]}</span>
        {!reference.valid && (
          <XCircle className="w-3.5 h-3.5 text-red-400 ml-auto" />
        )}
      </div>
      
      {/* Entity info */}
      <div className="flex items-center gap-2">
        <EntityIcon className="w-4 h-4 text-slate-400" />
        <span className="text-sm text-white font-medium truncate">
          {reference.displayName}
        </span>
      </div>
      
      {/* Entity type */}
      <div className="text-xs text-slate-500 mt-1">
        {entityConfig.label}
      </div>
    </button>
  );
}

// =============================================================================
// ENTITY LINK CARD
// =============================================================================

interface EntityLinkCardProps {
  link: EntityLink;
  onNavigate?: (ref: EntityReference) => void;
  onRemove?: (linkId: string) => void;
  showRemove?: boolean;
}

function EntityLinkCard({ link, onNavigate, onRemove, showRemove = false }: EntityLinkCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const linkStyle = LINK_TYPE_STYLES[link.linkType] || LINK_TYPE_STYLES['related-to'];
  
  return (
    <div className="border border-slate-700 rounded-lg overflow-hidden">
      {/* Link header */}
      <div className="flex items-center gap-2 px-3 py-2 bg-slate-800/50">
        <Link2 className="w-4 h-4 text-slate-500" />
        <Badge className={`${linkStyle.bgColor} ${linkStyle?.color ?? ''} border-0 text-xs`}>
          {linkStyle.label}
        </Badge>
        {link.bidirectional && (
          <span title="Bidirectional">
            <ArrowLeftRight className="w-3.5 h-3.5 text-slate-500" />
          </span>
        )}
        <span className="text-xs text-slate-500 ml-auto">
          {new Date(link.createdAt).toLocaleDateString()}
        </span>
        
        {/* Actions */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1 hover:bg-white/5 rounded"
        >
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-slate-400" />
          )}
        </button>
        
        {showRemove && onRemove && (
          <button
            onClick={() => onRemove(link.id)}
            className="p-1 hover:bg-red-500/10 rounded text-slate-400 hover:text-red-400 transition-colors"
            title="Remove link"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
      
      {/* Entity references */}
      <div className="flex items-stretch gap-2 p-3 bg-slate-900/50">
        <EntityReferenceCard 
          reference={link.sourceRef} 
          position="source"
          onNavigate={onNavigate}
        />
        
        <div className="flex items-center">
          <ArrowRight className="w-5 h-5 text-slate-600" />
        </div>
        
        <EntityReferenceCard 
          reference={link.targetRef} 
          position="target"
          onNavigate={onNavigate}
        />
      </div>
      
      {/* Expanded metadata */}
      {isExpanded && (
        <div className="px-3 py-2 border-t border-slate-700/50 bg-slate-900/30">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            <div>
              <span className="text-slate-500">Link ID:</span>
              <span className="text-slate-300 ml-1">{link.id}</span>
            </div>
            <div>
              <span className="text-slate-500">Created by:</span>
              <span className="text-slate-300 ml-1">{link.createdBy || 'Unknown'}</span>
            </div>
            {link.metadata && Object.entries(link.metadata).map(([key, value]) => (
              <div key={key}>
                <span className="text-slate-500">{key}:</span>
                <span className="text-slate-300 ml-1">{String(value)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

interface EntityLinkNavigatorProps {
  /** Entity type to filter links for */
  entityType?: SharedEntityType;
  /** Entity ID to filter links for */
  entityId?: string;
  /** Allow creating new links */
  allowCreate?: boolean;
  /** Allow removing links */
  allowRemove?: boolean;
  /** Callback when navigating to an entity */
  onNavigate?: (ref: EntityReference) => void;
  /** Title override */
  title?: string;
  /** CSS class for container */
  className?: string;
}

export function EntityLinkNavigator({
  entityType,
  entityId,
  allowCreate = false,
  allowRemove = false,
  onNavigate,
  title = 'Entity Links',
  className = '',
}: EntityLinkNavigatorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [linkTypeFilter, setLinkTypeFilter] = useState<string | 'all'>('all');
  
  // Get all links from store
  const allLinks = useCrossModuleStore(state => state.entityLinks);
  const removeEntityLink = useCrossModuleStore(state => state.removeEntityLink);
  
  // Filter links
  const filteredLinks = useMemo(() => {
    let links = allLinks;
    
    // Filter by entity if specified
    if (entityType && entityId) {
      links = links.filter(l =>
        (l.sourceRef.entityType === entityType && l.sourceRef.entityId === entityId) ||
        (l.targetRef.entityType === entityType && l.targetRef.entityId === entityId)
      );
    }
    
    // Filter by link type
    if (linkTypeFilter !== 'all') {
      links = links.filter(l => l.linkType === linkTypeFilter);
    }
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      links = links.filter(l =>
        l.sourceRef.displayName.toLowerCase().includes(query) ||
        l.targetRef.displayName.toLowerCase().includes(query)
      );
    }
    
    return links;
  }, [allLinks, entityType, entityId, linkTypeFilter, searchQuery]);
  
  // Get unique link types for filter
  const availableLinkTypes = useMemo(() => {
    const types = new Set(allLinks.map(l => l.linkType));
    return Array.from(types);
  }, [allLinks]);
  
  // Count by link type
  const linkTypeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredLinks.forEach(l => {
      counts[l.linkType] = (counts[l.linkType] || 0) + 1;
    });
    return counts;
  }, [filteredLinks]);
  
  return (
    <div className={`bg-slate-800/50 rounded-lg border border-slate-700 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <Link2 className="w-4 h-4 text-purple-400" />
          <h3 className="text-sm font-medium text-white">{title}</h3>
          <Badge variant={filteredLinks.length > 0 ? 'default' : 'outline'} className="text-xs">
            {filteredLinks.length}
          </Badge>
        </div>
        
        {allowCreate && (
          <Button variant="ghost" size="sm" className="gap-1">
            <Plus className="w-4 h-4" />
            Add Link
          </Button>
        )}
      </div>
      
      {/* Search and filters */}
      <div className="px-4 py-2 border-b border-slate-700/50 space-y-2">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search linked entities..."
            className="w-full pl-8 pr-3 py-1.5 bg-slate-900/50 border border-slate-700 rounded text-sm text-white placeholder-slate-500 focus:outline-none focus:border-slate-600"
          />
        </div>
        
        {/* Link type filter */}
        {availableLinkTypes.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto">
            <Filter className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
            <button
              onClick={() => setLinkTypeFilter('all')}
              className={`px-2 py-0.5 rounded text-xs transition-colors ${
                linkTypeFilter === 'all' 
                  ? 'bg-purple-500/20 text-purple-400' 
                  : 'text-slate-400 hover:bg-white/5'
              }`}
            >
              All
            </button>
            {availableLinkTypes.map(type => {
              const style = LINK_TYPE_STYLES[type] || LINK_TYPE_STYLES['related-to'];
              return (
                <button
                  key={type}
                  onClick={() => setLinkTypeFilter(type)}
                  className={`px-2 py-0.5 rounded text-xs transition-colors whitespace-nowrap ${
                    linkTypeFilter === type 
                      ? `${style.bgColor} ${style?.color ?? ''}` 
                      : 'text-slate-400 hover:bg-white/5'
                  }`}
                >
                  {style.label}
                  {linkTypeCounts[type] && (
                    <span className="ml-1 text-slate-500">({linkTypeCounts[type]})</span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
      
      {/* Links list */}
      <div className="overflow-y-auto max-h-96">
        {filteredLinks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-slate-500">
            <Link2 className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-sm">No entity links found</p>
            {entityType && entityId ? (
              <p className="text-xs mt-1">This entity has no cross-module relationships</p>
            ) : (
              <p className="text-xs mt-1">Links will appear here when entities are connected</p>
            )}
          </div>
        ) : (
          <div className="p-3 space-y-3">
            {filteredLinks.map(link => (
              <EntityLinkCard
                key={link.id}
                link={link}
                onNavigate={onNavigate}
                onRemove={allowRemove ? removeEntityLink : undefined}
                showRemove={allowRemove}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default EntityLinkNavigator;
