// ============================================================================
// ContentCollectionPanel - v0.38.5
// Auto Content Collection UI for Submission Builder
// ============================================================================
// Shows:
// - Content readiness by module
// - Auto-collected content from Authoring/TMF/CMC
// - Missing content with actions to collect or assign
// - One-click "Collect All" functionality
// ============================================================================


import React, { useState, useCallback, useEffect } from 'react';
import {
  Folder, FileText, CheckCircle, Clock, AlertCircle, AlertTriangle,
  RefreshCw, ChevronRight, ChevronDown, Download, Upload, Link2,
  Sparkles, Loader2, Database, FileCheck, Package, Search,
  Play, Eye, Plus, ExternalLink, Layers
} from 'lucide-react';
import {
  useContentCollectionStore,
  ContentCollectionConfig,
  CollectedContent,
  ContentRequirement,
  CTDModule,
  ContentSource,
  ContentStatus,
} from '@/store/useContentCollectionStore';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { SearchInput } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';

// ============================================================================
// CONSTANTS
// ============================================================================

const MODULE_CONFIG: Record<CTDModule, { label: string; color: string; bgColor: string }> = {
  '1': { label: 'Module 1 - Administrative', color: 'text-slate-400', bgColor: 'bg-slate-500/20' },
  '2': { label: 'Module 2 - Summaries', color: 'text-blue-400', bgColor: 'bg-blue-500/20' },
  '3': { label: 'Module 3 - Quality (CMC)', color: 'text-green-400', bgColor: 'bg-green-500/20' },
  '4': { label: 'Module 4 - Nonclinical', color: 'text-purple-400', bgColor: 'bg-purple-500/20' },
  '5': { label: 'Module 5 - Clinical', color: 'text-amber-400', bgColor: 'bg-amber-500/20' },
};

const SOURCE_CONFIG: Record<ContentSource, { label: string; icon: React.ElementType; color: string }> = {
  'authoring': { label: 'Authoring', icon: FileText, color: 'text-blue-400' },
  'tmf': { label: 'TMF', icon: Folder, color: 'text-purple-400' },
  'cmc': { label: 'CMC', icon: Database, color: 'text-green-400' },
  'clinical': { label: 'Clinical', icon: FileCheck, color: 'text-amber-400' },
  'safety': { label: 'Safety', icon: AlertTriangle, color: 'text-red-400' },
  'upload': { label: 'Upload', icon: Upload, color: 'text-slate-400' },
  'reference': { label: 'Reference', icon: Link2, color: 'text-cyan-400' },
};

const STATUS_CONFIG: Record<ContentStatus, { label: string; icon: React.ElementType; color: string; bgColor: string }> = {
  'available': { label: 'Available', icon: CheckCircle, color: 'text-green-400', bgColor: 'bg-green-500/20' },
  'in-progress': { label: 'In Progress', icon: Clock, color: 'text-amber-400', bgColor: 'bg-amber-500/20' },
  'missing': { label: 'Missing', icon: AlertCircle, color: 'text-red-400', bgColor: 'bg-red-500/20' },
  'needs-update': { label: 'Needs Update', icon: RefreshCw, color: 'text-amber-400', bgColor: 'bg-amber-500/20' },
  'draft': { label: 'Draft', icon: FileText, color: 'text-slate-400', bgColor: 'bg-slate-500/20' },
};

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function ModuleProgressBar({ 
  module, 
  available, 
  inProgress, 
  total 
}: { 
  module: CTDModule;
  available: number;
  inProgress: number;
  total: number;
}) {
  const config = MODULE_CONFIG[module];
  const percent = total > 0 ? Math.round(((available + inProgress * 0.5) / total) * 100) : 0;
  
  return (
    <div className="flex items-center gap-3">
      <div className="w-24 text-xs text-text-muted">Module {module}</div>
      <div className="flex-1 h-2 bg-surface-card rounded-full overflow-hidden">
        <div className="h-full flex">
          <div
            className="h-full bg-green-500 transition-all"
            style={{ width: `${(available / Math.max(total, 1)) * 100}%` }}
          />
          <div
            className="h-full bg-amber-500 transition-all"
            style={{ width: `${(inProgress / Math.max(total, 1)) * 100}%` }}
          />
        </div>
      </div>
      <div className="w-16 text-xs text-text-secondary text-right">
        {available}/{total}
      </div>
    </div>
  );
}

function ContentRow({ 
  content, 
  onView,
  onRemove,
}: { 
  content: CollectedContent;
  onView?: () => void;
  onRemove?: () => void;
}) {
  const statusConfig = STATUS_CONFIG[content.status];
  const StatusIcon = statusConfig.icon;
  const sourceConfig = SOURCE_CONFIG[content.source];
  const SourceIcon = sourceConfig.icon;
  
  return (
    <div className="flex items-center gap-3 p-3 bg-surface-card rounded-lg hover:bg-surface-elevated transition-colors">
      <span className={`w-2 h-2 rounded-full ${
        content.status === 'available' ? 'bg-green-500' :
        content.status === 'in-progress' ? 'bg-amber-500' :
        'bg-red-500'
      }`} />
      
      <div className="w-14 text-xs text-text-muted font-mono">{content.ctdSection}</div>
      
      <div className="flex-1 min-w-0">
        <div className="text-sm text-text-primary truncate">{content.documentTitle}</div>
        <div className="text-xs text-text-muted flex items-center gap-2">
          <SourceIcon className="w-3 h-3" />
          <span>{content.sourceLabel}</span>
          {content.version && <span>v{content.version}</span>}
        </div>
      </div>
      
      <span className={`text-xs px-2 py-0.5 rounded flex items-center gap-1 ${statusConfig.bgColor} ${statusConfig?.color ?? ''}`}>
        <StatusIcon className="w-3 h-3" />
        {statusConfig.label}
      </span>
      
      <div className="flex items-center gap-1">
        {onView && (
          <button 
            onClick={onView}
            className="p-1.5 hover:bg-surface-elevated rounded text-text-muted hover:text-text-primary"
          >
            <Eye className="w-4 h-4" />
          </button>
        )}
        {onRemove && (
          <button 
            onClick={onRemove}
            className="p-1.5 hover:bg-red-500/20 rounded text-text-muted hover:text-red-400"
          >
            <AlertCircle className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

function MissingRequirementRow({
  requirement,
  onCollect,
  onAssign,
}: {
  requirement: ContentRequirement;
  onCollect?: () => void;
  onAssign?: () => void;
}) {
  const moduleConfig = MODULE_CONFIG[requirement.module];
  
  return (
    <div className="flex items-center gap-3 p-3 bg-red-500/5 border border-red-500/20 rounded-lg">
      <AlertCircle className="w-4 h-4 text-red-400" />
      
      <div className="w-14 text-xs text-red-400 font-mono">{requirement.ctdSection}</div>
      
      <div className="flex-1 min-w-0">
        <div className="text-sm text-text-primary">{requirement.documentTitle}</div>
        <div className="text-xs text-text-muted">{requirement.ctdSectionTitle}</div>
      </div>
      
      {requirement.required && (
        <span className="text-xs text-red-400">Required</span>
      )}
      
      <div className="flex items-center gap-2">
        {onCollect && (
          <button
            onClick={onCollect}
            className="text-xs px-2 py-1 bg-accent-blue/20 text-accent-blue rounded hover:bg-accent-blue/30"
          >
            Search
          </button>
        )}
        {onAssign && (
          <button
            onClick={onAssign}
            className="text-xs px-2 py-1 bg-surface-elevated text-text-secondary rounded hover:text-text-primary"
          >
            Assign
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

interface ContentCollectionPanelProps {
  config: ContentCollectionConfig;
  onContentReady?: () => void;
}

export function ContentCollectionPanel({ config, onContentReady }: ContentCollectionPanelProps) {
  const toast = useToast();
  const [expandedModule, setExpandedModule] = useState<CTDModule | null>('2');
  const [showMissing, setShowMissing] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  const {
    setConfig,
    collectAll,
    getSummary,
    getMissingRequirements,
    getContentByModule,
    removeContent,
    isCollecting,
    collectedContent,
    requirements,
  } = useContentCollectionStore();
  
  // Initialize on mount
  useEffect(() => {
    setConfig(config);
  }, [config, setConfig]);
  
  const summary = getSummary();
  const missingRequirements = getMissingRequirements();
  
  // Handle collect all
  const handleCollectAll = useCallback(async () => {
    toast.info('Scanning for available content...');
    const result = await collectAll();
    toast.success(`Found ${result.available} ready documents, ${result.inProgress} in progress`);
    
    if (result.readinessPercent >= 100 && onContentReady) {
      onContentReady();
    }
  }, [collectAll, toast, onContentReady]);
  
  // Handle view content
  const handleViewContent = useCallback((content: CollectedContent) => {
    toast.info(`Opening ${content.documentTitle}...`);
    // In production, navigate to source document
  }, [toast]);
  
  // Handle remove content
  const handleRemoveContent = useCallback((contentId: string) => {
    removeContent(contentId);
    toast.info('Content removed from collection');
  }, [removeContent, toast]);
  
  // Handle assign missing
  const handleAssignMissing = useCallback((requirement: ContentRequirement) => {
    toast.info(`Opening assignment for ${requirement.documentTitle}...`);
    // In production, open TaskAssignmentPanel
  }, [toast]);
  
  // Filter content by search
  const filteredContent = Object.values(collectedContent).filter(c => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      c.documentTitle.toLowerCase().includes(query) ||
      c.ctdSection.toLowerCase().includes(query) ||
      c.sourceLabel.toLowerCase().includes(query)
    );
  });
  
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent-blue/20 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-accent-blue" />
            </div>
            <div>
              <h3 className="font-semibold text-text-primary">Content Collection</h3>
              <p className="text-sm text-text-muted">
                Auto-collect documents from Authoring, TMF, CMC
              </p>
            </div>
          </div>
          
          <Button
            variant="primary"
            onClick={handleCollectAll}
            disabled={isCollecting}
          >
            {isCollecting ? (
              <>
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                Collecting...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-1" />
                Collect All
              </>
            )}
          </Button>
        </div>
        
        {/* Summary Stats */}
        <div className="grid grid-cols-5 gap-3">
          <div className="p-3 bg-surface-card rounded-lg text-center">
            <div className="text-2xl font-bold text-text-primary">{summary.totalRequired}</div>
            <div className="text-xs text-text-muted">Required</div>
          </div>
          <div className="p-3 bg-green-500/10 rounded-lg text-center">
            <div className="text-2xl font-bold text-green-400">{summary.available}</div>
            <div className="text-xs text-text-muted">Available</div>
          </div>
          <div className="p-3 bg-amber-500/10 rounded-lg text-center">
            <div className="text-2xl font-bold text-amber-400">{summary.inProgress}</div>
            <div className="text-xs text-text-muted">In Progress</div>
          </div>
          <div className="p-3 bg-red-500/10 rounded-lg text-center">
            <div className="text-2xl font-bold text-red-400">{summary.missing}</div>
            <div className="text-xs text-text-muted">Missing</div>
          </div>
          <div className="p-3 bg-accent-blue/10 rounded-lg text-center">
            <div className="text-2xl font-bold text-accent-blue">{summary.readinessPercent}%</div>
            <div className="text-xs text-text-muted">Ready</div>
          </div>
        </div>
      </div>
      
      {/* Module Progress */}
      <div className="p-4 border-b border-border space-y-2">
        <div className="text-sm font-medium text-text-primary mb-3">Progress by Module</div>
        {(['1', '2', '3', '4', '5'] as CTDModule[]).map(module => (
          <ModuleProgressBar
            key={module}
            module={module}
            available={summary.byModule[module].available}
            inProgress={summary.byModule[module].inProgress}
            total={summary.byModule[module].total}
          />
        ))}
      </div>
      
      {/* Content List */}
      <div className="flex-1 overflow-auto">
        {/* Missing Requirements Section */}
        {showMissing && missingRequirements.length > 0 && (
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-red-400">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm font-medium">Missing Content ({missingRequirements.length})</span>
              </div>
              <button
                onClick={() => setShowMissing(false)}
                className="text-xs text-text-muted hover:text-text-secondary"
              >
                Hide
              </button>
            </div>
            <div className="space-y-2">
              {missingRequirements.slice(0, 5).map(req => (
                <MissingRequirementRow
                  key={req.id}
                  requirement={req}
                  onAssign={() => handleAssignMissing(req)}
                />
              ))}
              {missingRequirements.length > 5 && (
                <div className="text-xs text-text-muted text-center py-2">
                  +{missingRequirements.length - 5} more missing items
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Collected Content by Module */}
        <div className="p-4 space-y-4">
          <div className="flex items-center gap-3">
            <SearchInput
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search collected content..."
              className="flex-1"
            />
          </div>
          
          {(['2', '5', '3', '4', '1'] as CTDModule[]).map(module => {
            const moduleContent = getContentByModule(module).filter(c => {
              if (!searchQuery) return true;
              const query = searchQuery.toLowerCase();
              return (
                c.documentTitle.toLowerCase().includes(query) ||
                c.ctdSection.toLowerCase().includes(query)
              );
            });
            
            if (moduleContent.length === 0 && !searchQuery) return null;
            
            const isExpanded = expandedModule === module;
            const config = MODULE_CONFIG[module];
            
            return (
              <div key={module} className="border border-border rounded-lg overflow-hidden">
                <button
                  onClick={() => setExpandedModule(isExpanded ? null : module)}
                  className="w-full p-3 flex items-center justify-between bg-surface-elevated hover:bg-surface-card transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-2 h-2 rounded-full ${
                      summary.byModule[module].missing === 0 ? 'bg-green-500' :
                      summary.byModule[module].available > 0 ? 'bg-amber-500' :
                      'bg-red-500'
                    }`} />
                    <span className="text-sm font-medium text-text-primary">{config.label}</span>
                    <span className="text-xs text-text-muted">
                      ({moduleContent.length} items)
                    </span>
                  </div>
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-text-muted" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-text-muted" />
                  )}
                </button>
                
                {isExpanded && (
                  <div className="p-3 space-y-2 bg-surface">
                    {moduleContent.length > 0 ? (
                      moduleContent.map(content => (
                        <ContentRow
                          key={content.id}
                          content={content}
                          onView={() => handleViewContent(content)}
                          onRemove={() => handleRemoveContent(content.id)}
                        />
                      ))
                    ) : (
                      <div className="text-center py-4 text-sm text-text-muted">
                        No content collected for this module
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Footer */}
      <div className="p-4 border-t border-border bg-surface-card">
        <div className="flex items-center justify-between">
          <div className="text-sm text-text-muted">
            {summary.available} of {summary.totalRequired} required documents collected
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm">
              <Upload className="w-4 h-4 mr-1" />
              Upload
            </Button>
            <Button variant="ghost" size="sm">
              <Link2 className="w-4 h-4 mr-1" />
              Add Reference
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ContentCollectionPanel;
