
/**
 * Document Lineage Visualization Panel
 * =====================================
 * Comprehensive panel showing full document lineage, version history,
 * cross-module presence, custody chain, and update impact analysis.
 * 
 * @version 0.14.8
 * @since 2026-01-08
 */


import React, { useState, useMemo } from 'react';
import {
  FileText, GitBranch, History, Layers, Clock, CheckCircle, AlertTriangle,
  Lock, Shield, ExternalLink, ChevronDown, ChevronUp, X, User, Calendar,
  ArrowRight, Link2, Eye, RefreshCw, Download, Filter,
} from 'lucide-react';
import { useDocumentLineageStore } from '@/store/useDocumentLineageStore';
import type {
  DocumentReference,
  VersionComparisonResult,
  ReferenceContext,
  LineageModule,
  CustodyEvent,
  LineageEvent,
  DocumentVersionInfo,
} from '@/types/document-lineage';

// =============================================================================
// TYPES
// =============================================================================

export interface DocumentLineagePanelProps {
  /** Source document ID to display lineage for */
  documentId: string;
  /** Optional: specific reference ID to highlight */
  highlightReferenceId?: string;
  /** Close handler */
  onClose?: () => void;
  /** Navigate to module handler */
  onNavigateToModule?: (module: LineageModule, recordId: string) => void;
}

type PanelTab = 'overview' | 'versions' | 'presence' | 'custody' | 'events';

// =============================================================================
// STYLING HELPERS
// =============================================================================

const moduleLabels: Record<LineageModule, string> = {
  'document-control': 'Document Control',
  'tmf': 'TMF',
  'submissions': 'Submissions',
  'psmf': 'PSMF',
  'ctms': 'CTMS',
  'safety': 'Safety',
  'qms': 'QMS',
  'eln': 'ELN',
  'authoring': 'Authoring',
  'publishing': 'Publishing',
};

const moduleStyles: Record<LineageModule, string> = {
  'document-control': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  'tmf': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  'submissions': 'bg-green-500/20 text-green-400 border-green-500/30',
  'psmf': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  'ctms': 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  'safety': 'bg-red-500/20 text-red-400 border-red-500/30',
  'qms': 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
  'eln': 'bg-teal-500/20 text-teal-400 border-teal-500/30',
  'authoring': 'bg-pink-500/20 text-pink-400 border-pink-500/30',
  'publishing': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
};

const stalenessStyles: Record<VersionComparisonResult['staleness'], string> = {
  'current': 'bg-green-500/20 text-green-400',
  'minor-update': 'bg-amber-500/20 text-amber-400',
  'major-update': 'bg-orange-500/20 text-orange-400',
  'critical-update': 'bg-red-500/20 text-red-400',
};

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

function ModuleBadge({ module }: { module: LineageModule }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${moduleStyles[module]}`}>
      <Layers className="w-3 h-3" />
      {moduleLabels[module]}
    </span>
  );
}

function VersionBadge({ version, isCurrent }: { version: string; isCurrent?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono ${
      isCurrent ? 'bg-green-500/20 text-green-400' : 'bg-gray-700 text-gray-300'
    }`}>
      v{version}
      {isCurrent && <CheckCircle className="w-3 h-3" />}
    </span>
  );
}

// =============================================================================
// OVERVIEW TAB
// =============================================================================

interface OverviewTabProps {
  documentId: string;
  references: DocumentReference[];
  versions: DocumentVersionInfo[];
  currentVersion: string;
  compareVersions: (refId: string) => VersionComparisonResult | null;
}

function OverviewTab({ documentId, references, versions, currentVersion, compareVersions }: OverviewTabProps) {
  const docRefs = references.filter(r => r.sourceDocumentId === documentId);
  
  const stats = useMemo(() => {
    let current = 0;
    let stale = 0;
    let frozen = 0;
    let holds = 0;
    
    docRefs.forEach(ref => {
      if (ref.referenceType === 'frozen') frozen++;
      if (ref.regulatoryHold) holds++;
      
      const comparison = compareVersions(ref.id);
      if (comparison?.isCurrent) {
        current++;
      } else if (comparison) {
        stale++;
      }
    });
    
    return { total: docRefs.length, current, stale, frozen, holds };
  }, [docRefs, compareVersions]);
  
  return (
    <div className="space-y-6">
      {/* Document Info */}
      <div className="p-4 rounded-lg bg-gray-800/50 border border-gray-700">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-sm text-gray-400">Source Document</div>
            <div className="text-lg font-medium text-white mt-1">{documentId}</div>
          </div>
          <VersionBadge version={currentVersion} isCurrent />
        </div>
        <div className="mt-4 text-xs text-gray-500">
          {versions.length} version{versions.length !== 1 ? 's' : ''} registered
        </div>
      </div>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3 rounded-lg bg-gray-800/50 border border-gray-700/50 text-center">
          <div className="text-2xl font-bold text-white">{stats.total}</div>
          <div className="text-xs text-gray-500">References</div>
        </div>
        <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-center">
          <div className="text-2xl font-bold text-green-400">{stats.current}</div>
          <div className="text-xs text-gray-500">Current</div>
        </div>
        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-center">
          <div className="text-2xl font-bold text-amber-400">{stats.stale}</div>
          <div className="text-xs text-gray-500">Stale</div>
        </div>
        <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-center">
          <div className="text-2xl font-bold text-blue-400">{stats.frozen}</div>
          <div className="text-xs text-gray-500">Frozen</div>
        </div>
      </div>
      
      {/* Quick Reference List */}
      <div>
        <div className="text-sm font-medium text-gray-400 mb-3">Active References</div>
        <div className="space-y-2">
          {docRefs.slice(0, 5).map(ref => {
            const comparison = compareVersions(ref.id);
            return (
              <div key={ref.id} className="flex items-center justify-between p-2 rounded bg-gray-800/50 border border-gray-700/50">
                <div className="flex items-center gap-2">
                  <ModuleBadge module={ref.context.module} />
                  <span className="text-sm text-gray-300 truncate max-w-48">{ref.context.recordName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">v{ref.sourceVersion}</span>
                  {comparison && !comparison.isCurrent && (
                    <span className={`text-xs px-1.5 py-0.5 rounded ${stalenessStyles[comparison.staleness]}`}>
                      →v{comparison.currentVersion}
                    </span>
                  )}
                  {ref.referenceType === 'frozen' && <Lock className="w-3 h-3 text-blue-400" />}
                  {ref.regulatoryHold && <Shield className="w-3 h-3 text-red-400" />}
                </div>
              </div>
            );
          })}
          {docRefs.length > 5 && (
            <div className="text-center text-xs text-gray-500 py-2">
              +{docRefs.length - 5} more references
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// VERSIONS TAB
// =============================================================================

interface VersionsTabProps {
  versions: DocumentVersionInfo[];
  currentVersion: string;
}

function VersionsTab({ versions, currentVersion }: VersionsTabProps) {
  return (
    <div className="space-y-4">
      <div className="text-sm font-medium text-gray-400">Version History</div>
      
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-700" />
        
        {/* Version entries */}
        <div className="space-y-4">
          {versions.map((version, idx) => (
            <div key={version.version} className="relative pl-10">
              {/* Timeline dot */}
              <div className={`absolute left-2.5 w-3 h-3 rounded-full border-2 ${
                version.version === currentVersion
                  ? 'bg-green-500 border-green-400'
                  : 'bg-gray-700 border-gray-600'
              }`} />
              
              <div className="p-3 rounded-lg bg-gray-800/50 border border-gray-700/50">
                <div className="flex items-center justify-between mb-2">
                  <VersionBadge version={version.version} isCurrent={version.version === currentVersion} />
                  <span className="text-xs text-gray-500">
                    {version.effectiveDate 
                      ? new Date(version.effectiveDate).toLocaleDateString()
                      : new Date(version.createdAt).toLocaleDateString()}
                  </span>
                </div>
                
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <User className="w-3 h-3" />
                  <span>{version.createdBy}</span>
                  <span className="text-gray-600">•</span>
                  <span className={`px-1.5 py-0.5 rounded ${
                    version.status === 'effective' ? 'bg-green-500/20 text-green-400' :
                    version.status === 'approved' ? 'bg-blue-500/20 text-blue-400' :
                    version.status === 'draft' ? 'bg-gray-500/20 text-gray-400' :
                    'bg-amber-500/20 text-amber-400'
                  }`}>{version.status}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// PRESENCE TAB
// =============================================================================

interface PresenceTabProps {
  documentId: string;
  presence: ReferenceContext[];
  references: DocumentReference[];
  compareVersions: (refId: string) => VersionComparisonResult | null;
  onNavigate?: (module: LineageModule, recordId: string) => void;
}

function PresenceTab({ documentId, presence, references, compareVersions, onNavigate }: PresenceTabProps) {
  // Group by module
  const byModule = useMemo(() => {
    const grouped: Record<LineageModule, ReferenceContext[]> = {} as any;
    presence.forEach(ctx => {
      if (!grouped[ctx.module]) grouped[ctx.module] = [];
      grouped[ctx.module].push(ctx);
    });
    return grouped;
  }, [presence]);
  
  return (
    <div className="space-y-4">
      <div className="text-sm font-medium text-gray-400">Cross-Module Presence</div>
      
      <div className="space-y-3">
        {Object.entries(byModule).map(([module, contexts]) => (
          <div key={module} className="p-3 rounded-lg bg-gray-800/50 border border-gray-700/50">
            <div className="flex items-center justify-between mb-3">
              <ModuleBadge module={module as LineageModule} />
              <span className="text-xs text-gray-500">{contexts.length} reference{contexts.length !== 1 ? 's' : ''}</span>
            </div>
            
            <div className="space-y-2">
              {contexts.map((ctx, idx) => {
                const ref = references.find(r => 
                  r.sourceDocumentId === documentId && 
                  r.context.module === ctx.module &&
                  r.context.recordId === ctx.recordId
                );
                const comparison = ref ? compareVersions(ref.id) : null;
                
                return (
                  <div 
                    key={idx}
                    className="flex items-center justify-between p-2 rounded bg-gray-800/50 hover:bg-gray-700/50 transition-colors cursor-pointer"
                    onClick={() => onNavigate?.(ctx.module, ctx.recordId)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-gray-300 truncate">{ctx.recordName}</div>
                      {ctx.location && (
                        <div className="text-xs text-gray-500 truncate">{ctx.location}</div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-2">
                      {ref && (
                        <span className="text-xs text-gray-500">v{ref.sourceVersion}</span>
                      )}
                      {comparison && !comparison.isCurrent && (
                        <AlertTriangle className={`w-3.5 h-3.5 ${
                          comparison.staleness === 'critical-update' ? 'text-red-400' : 'text-amber-400'
                        }`} />
                      )}
                      <ExternalLink className="w-3.5 h-3.5 text-gray-500" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// CUSTODY TAB
// =============================================================================

interface CustodyTabProps {
  referenceId: string;
  custodyChain: CustodyEvent[];
}

function CustodyTab({ referenceId, custodyChain }: CustodyTabProps) {
  if (custodyChain.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <History className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <div className="text-sm">No custody events recorded</div>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      <div className="text-sm font-medium text-gray-400">Custody Chain</div>
      
      <div className="relative">
        <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-700" />
        
        <div className="space-y-3">
          {custodyChain.map((event, idx) => (
            <div key={event.id} className="relative pl-10">
              <div className="absolute left-2.5 w-3 h-3 rounded-full bg-gray-600 border-2 border-gray-500" />
              
              <div className="p-3 rounded-lg bg-gray-800/50 border border-gray-700/50">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-300 capitalize">
                    {event.type.replace(/-/g, ' ')}
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Date(event.timestamp).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <User className="w-3 h-3" />
                  <span>{event.actor}</span>
                  {event.from && event.to && (
                    <>
                      <span>•</span>
                      <span>{event.from} → {event.to}</span>
                    </>
                  )}
                </div>
                {event.notes && (
                  <div className="mt-2 text-xs text-gray-400">{event.notes}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// EVENTS TAB
// =============================================================================

interface EventsTabProps {
  events: LineageEvent[];
}

function EventsTab({ events }: EventsTabProps) {
  const [filterType, setFilterType] = useState<string>('all');
  
  const filteredEvents = filterType === 'all' 
    ? events 
    : events.filter(e => e.type === filterType);
  
  const eventTypes = Array.from(new Set(events.map(e => e.type)));
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium text-gray-400">Event Log</div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="text-xs bg-gray-800 border border-gray-700 rounded px-2 py-1 text-gray-300"
        >
          <option value="all">All Events</option>
          {eventTypes.map(type => (
            <option key={type} value={type}>{type.replace(/-/g, ' ')}</option>
          ))}
        </select>
      </div>
      
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {filteredEvents.slice(0, 50).map(event => (
          <div key={event.id} className="p-2 rounded bg-gray-800/50 border border-gray-700/50">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-300 capitalize">
                {event.type.replace(/-/g, ' ')}
              </span>
              <span className="text-xs text-gray-500">
                {new Date(event.timestamp).toLocaleString()}
              </span>
            </div>
            <div className="mt-1 text-xs text-gray-500">
              <span>{event.actor}</span>
              {event.details && Object.keys(event.details).length > 0 && (
                <span className="ml-2 text-gray-600">
                  {Object.entries(event.details).map(([k, v]) => `${k}: ${v}`).join(', ')}
                </span>
              )}
            </div>
          </div>
        ))}
        {filteredEvents.length > 50 && (
          <div className="text-center text-xs text-gray-500 py-2">
            Showing 50 of {filteredEvents.length} events
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function DocumentLineagePanel({
  documentId,
  highlightReferenceId,
  onClose,
  onNavigateToModule,
}: DocumentLineagePanelProps) {
  const [activeTab, setActiveTab] = useState<PanelTab>('overview');
  
  // Store selectors
  const references = useDocumentLineageStore(state => state.references);
  const getVersionHistory = useDocumentLineageStore(state => state.getVersionHistory);
  const getCurrentVersion = useDocumentLineageStore(state => state.getCurrentVersion);
  const getCrossModulePresence = useDocumentLineageStore(state => state.getCrossModulePresence);
  const getCustodyChain = useDocumentLineageStore(state => state.getCustodyChain);
  const getEvents = useDocumentLineageStore(state => state.getEvents);
  const compareVersions = useDocumentLineageStore(state => state.compareVersions);
  
  // Computed data
  const versions = getVersionHistory(documentId);
  const currentVersion = getCurrentVersion(documentId);
  const presence = getCrossModulePresence(documentId);
  const events = getEvents({});
  
  // For custody, use highlighted reference or first found
  const targetRefId = highlightReferenceId || references.find(r => r.sourceDocumentId === documentId)?.id || '';
  const custodyChain = getCustodyChain(targetRefId);
  
  const tabs: { id: PanelTab; label: string; icon: typeof FileText }[] = [
    { id: 'overview', label: 'Overview', icon: FileText },
    { id: 'versions', label: 'Versions', icon: GitBranch },
    { id: 'presence', label: 'Presence', icon: Layers },
    { id: 'custody', label: 'Custody', icon: History },
    { id: 'events', label: 'Events', icon: Clock },
  ];
  
  return (
    <div className="h-full flex flex-col bg-gray-900 border-l border-gray-700">
      {/* Header */}
      <div className="flex-none p-4 border-b border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-blue-400" />
            <span className="font-medium text-white">Document Lineage</span>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-gray-300 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        
        {/* Tabs */}
        <div className="flex items-center gap-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-500/20 text-blue-400'
                  : 'text-gray-400 hover:text-gray-300 hover:bg-gray-800'
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'overview' && (
          <OverviewTab
            documentId={documentId}
            references={references}
            versions={versions}
            currentVersion={currentVersion || '1.0'}
            compareVersions={compareVersions}
          />
        )}
        {activeTab === 'versions' && (
          <VersionsTab
            versions={versions}
            currentVersion={currentVersion || '1.0'}
          />
        )}
        {activeTab === 'presence' && (
          <PresenceTab
            documentId={documentId}
            presence={presence}
            references={references}
            compareVersions={compareVersions}
            onNavigate={onNavigateToModule}
          />
        )}
        {activeTab === 'custody' && (
          <CustodyTab
            referenceId={targetRefId}
            custodyChain={custodyChain}
          />
        )}
        {activeTab === 'events' && (
          <EventsTab events={events} />
        )}
      </div>
      
      {/* Footer Actions */}
      <div className="flex-none p-3 border-t border-gray-700 flex items-center justify-between">
        <span className="text-xs text-gray-500">
          {presence.length} module{presence.length !== 1 ? 's' : ''} • {versions.length} version{versions.length !== 1 ? 's' : ''}
        </span>
        <div className="flex items-center gap-2">
          <button className="px-2 py-1 rounded text-xs text-gray-400 hover:text-gray-300 hover:bg-gray-800 transition-colors flex items-center gap-1">
            <RefreshCw className="w-3 h-3" />
            Refresh
          </button>
          <button className="px-2 py-1 rounded text-xs text-gray-400 hover:text-gray-300 hover:bg-gray-800 transition-colors flex items-center gap-1">
            <Download className="w-3 h-3" />
            Export
          </button>
        </div>
      </div>
    </div>
  );
}

export default DocumentLineagePanel;
