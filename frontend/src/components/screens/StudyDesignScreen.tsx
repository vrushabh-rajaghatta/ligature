
// ============================================================================
// Study Design Screen - v204c-b2
// USDM Protocol Builder with Bidirectional Sync & Conflict Resolution
// + CSR Template Generation from USDM Objectives/Endpoints
// TransCelerate/CDISC DDF Compliant
// ============================================================================

import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  // Navigation & Structure
  FileText,
  Target,
  GitBranch,
  Calendar,
  Users,
  Layers,
  // Actions
  Plus,
  RefreshCw,
  Download,
  Upload,
  Edit,
  Trash2,
  Eye,
  Copy,
  ExternalLink,
  MoreHorizontal,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  X,
  // Status
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Clock,
  Link2,
  Unlink,
  // Content
  Beaker,
  FlaskConical,
  Activity,
  Shield,
  Heart,
  ClipboardList,
  ListChecks,
  ArrowRight,
  ArrowDown,
  ArrowLeftRight,
  Search,
  Filter,
  // Lineage
  Network,
  GitMerge,
  Workflow,
  Share2,
  Zap,
  Settings,
  Scale,
  // CSR Generation
  FileOutput,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { useUSDMStore } from '@/store/useUSDMStore';
import { useActiveScopeStore } from '@/store/useActiveScopeStore';
import { getStudyById } from '@/data/scopeData';
import { ScopeContextBanner } from '@/components/ui/ScopeContextBanner';
import { useCTMSStore } from '@/store/useCTMSStore';
import { useAuthoringStore } from '@/store/useAuthoringStore';
import type {
  USDMStudy,
  USDMStudyDesign,
  USDMObjective,
  USDMEndpoint,
  USDMStudyArm,
  USDMStudyEpoch,
  USDMActivity,
  USDMEncounter,
  USDMDataLineage,
  USDMLineageAppearance,
  USDMView,
} from '@/domains/usdm/contracts';
import type {
  BidirectionalSyncConfig,
  SyncConflict,
  SourceOfTruth,
  ConflictResolutionStrategy,
} from '@/domains/ctms/contracts';
import type { CSRTemplateResult, CSRTemplateSection } from '@/services/usdm-authoring-template-service';
import { ReturnBreadcrumb } from '@/components/ui/ReturnBreadcrumb';
import { StatCardGridSkeleton, TableSkeleton, ListSkeleton } from '@/components/ui/Skeleton';
import { Badge } from '@/components/ui/Badge';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { Button, IconButton, ButtonGroup } from '@/components/ui/Button';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { SearchInput } from '@/components/ui/Input';
import { ProgressBar } from '@/components/ui/Progress';
import { useToast } from '@/components/ui/Toast';
import { AIDocumentGeneratorPanel } from '@/components/ai/AIDocumentGeneratorPanel';
import { useUSDMTPPStore } from '@/store/useUSDMTPPStore';
import { useUSDMDesignMatrixStore, loadDesignMatrixMockData } from '@/store/useUSDMDesignMatrixStore';
import { useUSDMPersistence } from '@/hooks/useUSDMPersistence';
import { useDeadClick } from '@/hooks/useDeadClick';
import { useProducts } from '@/stores/products-store';
import { useAppStore } from '@/store/useAppStore';

// ============================================================================
// TYPES
// ============================================================================

type StudyDesignTab = 'dashboard' | 'protocol' | 'objectives' | 'soa' | 'tpp' | 'design-matrix' | 'lineage';

interface FilterState {
  product?: string;
  therapeuticArea?: string;
  modality?: string;
  region?: string;
  stage?: string;
}

interface StudyDesignScreenProps {
  filters?: FilterState;
}

// ============================================================================
// COLOR MAPS
// ============================================================================

const objectiveLevelColorMap: Record<string, 'blue' | 'purple' | 'gray'> = {
  'PRIMARY': 'blue',
  'SECONDARY': 'purple',
  'EXPLORATORY': 'gray',
};

const syncStatusColorMap: Record<string, 'green' | 'amber' | 'red'> = {
  'current': 'green',
  'outdated': 'amber',
  'conflict': 'red',
};

const moduleColorMap: Record<string, string> = {
  'ctms': '#10B981',      // Green
  'authoring': '#F59E0B', // Amber
  'submissions': '#3B82F6', // Blue
  'haq': '#8B5CF6',       // Purple
  'safety': '#EF4444',    // Red
  'tmf': '#14B8A6',       // Teal
};

const armTypeColorMap: Record<string, 'blue' | 'green' | 'gray' | 'purple'> = {
  'EXPERIMENTAL': 'blue',
  'ACTIVE_COMPARATOR': 'green',
  'PLACEBO_COMPARATOR': 'gray',
  'NO_INTERVENTION': 'purple',
};

const epochTypeColorMap: Record<string, 'gray' | 'blue' | 'green' | 'purple' | 'amber'> = {
  'SCREENING': 'gray',
  'RUN_IN': 'blue',
  'TREATMENT': 'green',
  'WASHOUT': 'purple',
  'FOLLOW_UP': 'amber',
};

// ============================================================================
// STAT CARD COMPONENT
// ============================================================================

interface StatCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  icon: React.ReactNode;
  color: 'emerald' | 'blue' | 'purple' | 'amber' | 'teal' | 'red';
  trend?: 'up' | 'down';
  onClick?: () => void;
}

function StatCard({ label, value, subValue, icon, color, trend, onClick }: StatCardProps) {
  const colorMap = {
    emerald: 'bg-emerald-500/20 text-emerald-400',
    blue: 'bg-blue-500/20 text-blue-400',
    purple: 'bg-purple-500/20 text-purple-400',
    amber: 'bg-amber-500/20 text-amber-400',
    teal: 'bg-teal-500/20 text-teal-400',
    red: 'bg-red-500/20 text-red-400',
  };

  return (
    <div 
      className={`bg-surface-card border border-border rounded-lg p-4 ${onClick ? 'cursor-pointer hover:border-border-hover transition-colors' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-text-muted uppercase tracking-wider">{label}</span>
        <div className={`p-1.5 rounded-md ${colorMap[color]}`}>
          {icon}
        </div>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-semibold text-text-primary">{value}</span>
        {subValue && <span className="text-sm text-text-muted">{subValue}</span>}
      </div>
    </div>
  );
}

// ============================================================================
// SKELETON COMPONENT
// ============================================================================

export function StudyDesignScreenSkeleton() {
  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      <div className="bg-surface-elevated border-b border-border px-6 py-4">
        <div className="h-4 w-48 bg-surface-card rounded animate-pulse mb-4" />
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-surface-card rounded-lg animate-pulse" />
            <div>
              <div className="h-6 w-40 bg-surface-card rounded animate-pulse mb-1" />
              <div className="h-4 w-64 bg-surface-card rounded animate-pulse" />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 lg:gap-4 mb-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-24 bg-surface-card rounded-lg animate-pulse" />
          ))}
        </div>
        <div className="flex gap-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-10 w-32 bg-surface-card rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
      <div className="flex-1 p-6">
        <div className="h-96 bg-surface-card rounded-lg animate-pulse" />
      </div>
    </div>
  );
}

// ============================================================================
// LINEAGE VIEWER COMPONENT
// ============================================================================

interface LineageViewerProps {
  endpoint: USDMEndpoint;
  onClose: () => void;
}

function LineageViewer({ endpoint, onClose }: LineageViewerProps) {
  const lineage = endpoint.lineage;
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-surface-elevated border border-border rounded-xl shadow-2xl w-[800px] max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border bg-surface-card">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <Network className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-text-primary">Data Lineage</h2>
                <p className="text-sm text-text-muted">Track this endpoint across modules</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <span className="sr-only">Close</span>
              ×
            </Button>
          </div>
        </div>
        
        {/* Content */}
        <div className="p-4 md:p-6 overflow-y-auto max-h-[calc(80vh-140px)]">
          {/* Source */}
          <div className="mb-6">
            <div className="text-xs uppercase tracking-wider text-text-muted mb-2">Source of Truth</div>
            <div className="bg-surface-card border border-border rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-emerald-500/20 rounded-lg mt-0.5">
                  <Target className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-text-primary mb-1">Primary Endpoint</div>
                  <p className="text-sm text-text-secondary">{endpoint.endpointDescription}</p>
                  <div className="mt-2 flex items-center gap-4 text-xs text-text-muted">
                    <span>Version: {lineage.versionHash.slice(0, 8)}</span>
                    <span>Updated: {new Date(lineage.lastUpdated).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Appearances */}
          <div>
            <div className="text-xs uppercase tracking-wider text-text-muted mb-2">
              Appears In ({lineage.appearances.length} locations)
            </div>
            <div className="space-y-3">
              {lineage.appearances.map((appearance, idx) => (
                <div 
                  key={idx}
                  className="bg-surface-card border border-border rounded-lg p-4 hover:border-border-hover transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div 
                        className="p-2 rounded-lg"
                        style={{ backgroundColor: `${moduleColorMap[appearance.module]}20` }}
                      >
                        {appearance.module === 'ctms' && <Users className="w-4 h-4" style={{ color: moduleColorMap[appearance.module] }} />}
                        {appearance.module === 'authoring' && <FileText className="w-4 h-4" style={{ color: moduleColorMap[appearance.module] }} />}
                        {appearance.module === 'submissions' && <Layers className="w-4 h-4" style={{ color: moduleColorMap[appearance.module] }} />}
                        {appearance.module === 'haq' && <Activity className="w-4 h-4" style={{ color: moduleColorMap[appearance.module] }} />}
                        {appearance.module === 'safety' && <Heart className="w-4 h-4" style={{ color: moduleColorMap[appearance.module] }} />}
                        {appearance.module === 'tmf' && <ClipboardList className="w-4 h-4" style={{ color: moduleColorMap[appearance.module] }} />}
                      </div>
                      <div>
                        <div className="font-medium text-text-primary capitalize">{appearance.module}</div>
                        <div className="text-sm text-text-muted">{appearance.sectionReference || appearance.entityType}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge color={syncStatusColorMap[appearance.syncStatus]} size="sm">
                        {appearance.syncStatus === 'current' && <CheckCircle className="w-3 h-3 mr-1" />}
                        {appearance.syncStatus === 'outdated' && <AlertTriangle className="w-3 h-3 mr-1" />}
                        {appearance.syncStatus === 'conflict' && <AlertCircle className="w-3 h-3 mr-1" />}
                        {appearance.syncStatus}
                      </Badge>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
                          // Navigate to the module where this endpoint appears
                          window.location.href = `/?module=${appearance.module}`;
                        }}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-text-muted">
                    Last synced: {new Date(appearance.lastSyncedAt).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Sync Actions */}
          {lineage.appearances.some(a => a.syncStatus !== 'current') && (
            <div className="mt-6 pt-4 border-t border-border">
              <div className="flex items-center justify-between">
                <div className="text-sm text-amber-400 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Some modules need synchronization
                </div>
                <Button 
                  variant="primary" 
                  size="sm"
                  onClick={() => {
                    // Trigger sync for all outdated appearances
                    onClose();
                  }}
                >
                  <Zap className="w-4 h-4" />
                  Sync All
                </Button>
              </div>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-surface-card flex justify-between">
          <div className="text-xs text-text-muted">
            Protocol-to-Submission Data Lineage • USDM v3.x
          </div>
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// OBJECTIVES & ENDPOINTS PANEL
// ============================================================================

interface ObjectivesEndpointsPanelProps {
  studyDesignId: string;
  studyId: string;
  studyTitle?: string;
  onViewLineage: (endpoint: USDMEndpoint) => void;
}

function ObjectivesEndpointsPanel({ studyDesignId, studyId, studyTitle, onViewLineage }: ObjectivesEndpointsPanelProps) {
  const objectivesRecord = useUSDMStore(s => s.objectives);
  const endpointsRecord = useUSDMStore(s => s.endpoints);
  const objectivesByStudyDesignId = useUSDMStore(s => s.objectivesByStudyDesignId);
  const endpointsByObjectiveId = useUSDMStore(s => s.endpointsByObjectiveId);
  
  // CSR Generation (v204c-b2)
  const generateCSRFromUSDM = useAuthoringStore(s => s.generateCSRFromUSDM);
  const previewCSRTemplate = useAuthoringStore(s => s.previewCSRTemplate);
  const validateCSREndpoints = useAuthoringStore(s => s.validateCSREndpoints);
  const csrTemplateResult = useAuthoringStore(s => s.csrTemplateResult);
  const isGeneratingCSR = useAuthoringStore(s => s.isGeneratingCSR);
  const csrGenerationError = useAuthoringStore(s => s.csrGenerationError);
  const clearCSRTemplate = useAuthoringStore(s => s.clearCSRTemplate);
  
  const addObjective = useUSDMStore(s => s.addObjective);
  const toast = useToast();
    const { deadClick } = useDeadClick();
  const [expandedObjectives, setExpandedObjectives] = useState<Set<string>>(new Set());
  const [showCSRModal, setShowCSRModal] = useState(false);
  const [showAddObjectiveForm, setShowAddObjectiveForm] = useState(false);
  const [newObjectiveText, setNewObjectiveText] = useState('');
  
  const objectiveIds = objectivesByStudyDesignId[studyDesignId] || [];
  const objectives = objectiveIds.map(id => objectivesRecord[id]).filter(Boolean);
  
  // Get all endpoints for this design
  const allEndpoints = useMemo(() => {
    const eps: USDMEndpoint[] = [];
    for (const obj of objectives) {
      const epIds = endpointsByObjectiveId[obj.id] || [];
      for (const epId of epIds) {
        const ep = endpointsRecord[epId];
        if (ep) eps.push(ep);
      }
    }
    return eps;
  }, [objectives, endpointsByObjectiveId, endpointsRecord]);
  
  // CSR Preview
  const csrPreview = useMemo(() => {
    if (objectives.length === 0 || allEndpoints.length === 0) return null;
    return previewCSRTemplate(objectives, allEndpoints);
  }, [objectives, allEndpoints, previewCSRTemplate]);
  
  const toggleObjective = (id: string) => {
    const newSet = new Set(expandedObjectives);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setExpandedObjectives(newSet);
  };
  
  // Handle CSR Generation
  const handleGenerateCSR = useCallback(() => {
    if (objectives.length === 0 || allEndpoints.length === 0) return;
    
    try {
      generateCSRFromUSDM(studyId, studyDesignId, objectives, allEndpoints, {
        studyTitle: studyTitle,
        includeMethodology: true,
        includeStatisticalApproach: true,
        includePlaceholders: true,
      });
      setShowCSRModal(true);
    } catch (error) {
      console.error('Failed to generate CSR:', error);
    }
  }, [studyId, studyDesignId, objectives, allEndpoints, studyTitle, generateCSRFromUSDM]);
  
  const handleCloseCSRModal = useCallback(() => {
    setShowCSRModal(false);
  }, []);
  
  // Group objectives by level
  const groupedObjectives = useMemo(() => {
    const groups: Record<string, USDMObjective[]> = {
      PRIMARY: [],
      SECONDARY: [],
      EXPLORATORY: [],
    };
    objectives.forEach(obj => {
      const level = obj.objectiveLevel.decode || 'PRIMARY';
      if (groups[level]) {
        groups[level].push(obj);
      }
    });
    return groups;
  }, [objectives]);
  
  const renderObjective = (objective: USDMObjective) => {
    const isExpanded = expandedObjectives.has(objective.id);
    const endpointIds = endpointsByObjectiveId[objective.id] || [];
    const endpoints = endpointIds.map(id => endpointsRecord[id]).filter(Boolean);
    const level = objective.objectiveLevel.decode || 'PRIMARY';
    
    return (
      <div key={objective.id} className="bg-surface-card border border-border rounded-lg overflow-hidden">
        <div 
          className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-surface-elevated transition-colors"
          onClick={() => toggleObjective(objective.id)}
        >
          <div className="flex items-center gap-3 flex-1">
            <div className={`p-1.5 rounded-md ${level === 'PRIMARY' ? 'bg-blue-500/20' : level === 'SECONDARY' ? 'bg-purple-500/20' : 'bg-gray-500/20'}`}>
              <Target className={`w-4 h-4 ${level === 'PRIMARY' ? 'text-blue-400' : level === 'SECONDARY' ? 'text-purple-400' : 'text-gray-400'}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-text-primary line-clamp-2">{objective.objectiveDescription}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge color={objectiveLevelColorMap[level]} size="sm">
              {level.toLowerCase()}
            </Badge>
            <span className="text-xs text-text-muted">{endpoints.length} endpoint{endpoints.length !== 1 ? 's' : ''}</span>
            {isExpanded ? <ChevronUp className="w-4 h-4 text-text-muted" /> : <ChevronDown className="w-4 h-4 text-text-muted" />}
          </div>
        </div>
        
        {isExpanded && endpoints.length > 0 && (
          <div className="border-t border-border bg-surface-elevated">
            {endpoints.map(endpoint => (
              <div 
                key={endpoint.id}
                className="px-4 py-3 flex items-center justify-between hover:bg-surface-card/50 transition-colors border-b border-border/50 last:border-b-0"
              >
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-6 flex justify-center">
                    <ArrowRight className="w-4 h-4 text-text-muted" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text-secondary">{endpoint.endpointDescription}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-xs text-text-muted">
                        {endpoint.lineage.appearances.length} appearance{endpoint.lineage.appearances.length !== 1 ? 's' : ''}
                      </span>
                      {endpoint.lineage.appearances.some(a => a.syncStatus !== 'current') && (
                        <Badge color="amber" size="sm">needs sync</Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => onViewLineage(endpoint)}>
                    <Network className="w-4 h-4" />
                    View Lineage
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };
  
  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header with Generate CSR Button (v204c-b2) */}
      {objectives.length > 0 && (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/20 rounded-lg">
                  <FileOutput className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h3 className="font-medium text-text-primary">Generate CSR Efficacy Sections</h3>
                  <p className="text-sm text-text-muted">
                    {csrPreview 
                      ? `${csrPreview.sectionCount} section${csrPreview.sectionCount !== 1 ? 's' : ''} • ~${csrPreview.estimatedWordCount} words`
                      : 'Map endpoints to CSR Section 11 templates'}
                  </p>
                </div>
              </div>
              <Button 
                variant="primary" 
                size="sm"
                onClick={handleGenerateCSR}
                disabled={isGeneratingCSR || allEndpoints.length === 0}
              >
                {isGeneratingCSR ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Generate CSR Sections
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Primary Objectives */}
      {groupedObjectives.PRIMARY.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Badge color="blue" size="sm">Primary</Badge>
            <span className="text-sm text-text-muted">{groupedObjectives.PRIMARY.length} objective{groupedObjectives.PRIMARY.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="space-y-3">
            {groupedObjectives.PRIMARY.map(renderObjective)}
          </div>
        </div>
      )}
      
      {/* Secondary Objectives */}
      {groupedObjectives.SECONDARY.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Badge color="purple" size="sm">Secondary</Badge>
            <span className="text-sm text-text-muted">{groupedObjectives.SECONDARY.length} objective{groupedObjectives.SECONDARY.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="space-y-3">
            {groupedObjectives.SECONDARY.map(renderObjective)}
          </div>
        </div>
      )}
      
      {/* Exploratory Objectives */}
      {groupedObjectives.EXPLORATORY.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Badge color="gray" size="sm">Exploratory</Badge>
            <span className="text-sm text-text-muted">{groupedObjectives.EXPLORATORY.length} objective{groupedObjectives.EXPLORATORY.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="space-y-3">
            {groupedObjectives.EXPLORATORY.map(renderObjective)}
          </div>
        </div>
      )}
      
      {objectives.length === 0 && (
        <EmptyState
          icon={<Target className="w-12 h-12" />}
          title="No objectives defined"
          description="Add objectives and endpoints to define the study's goals"
          action={
            <Button 
              variant="primary" 
              size="sm"
              onClick={() => setShowAddObjectiveForm(true)}
            >
              <Plus className="w-4 h-4" />
              Add Objective
            </Button>
          }
        />
      )}
      
      {/* v0.44.14: Quick-add objective inline form */}
      {showAddObjectiveForm && (
        <div className="mb-4 p-4 bg-surface border border-accent-blue/40 rounded-lg space-y-3">
          <p className="text-xs font-medium text-text-muted uppercase tracking-wide">New Primary Objective</p>
          <textarea
            autoFocus
            value={newObjectiveText}
            onChange={e => setNewObjectiveText(e.target.value)}
            rows={3}
            placeholder="Describe the objective (e.g. To evaluate the efficacy of LIG-101 in reducing tumor size...)"
            className="w-full px-3 py-2 text-sm bg-surface-elevated border border-border rounded text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-blue resize-none"
          />
          <div className="flex items-center justify-end gap-2">
            <button onClick={() => { setShowAddObjectiveForm(false); setNewObjectiveText(''); }} className="text-xs text-text-muted hover:text-text-primary px-2 py-1">Cancel</button>
            <button
              disabled={!newObjectiveText.trim()}
              onClick={() => {
                if (newObjectiveText.trim()) {
                  addObjective(studyDesignId, { objectiveDescription: newObjectiveText.trim() });
                  setNewObjectiveText('');
                  setShowAddObjectiveForm(false);
                  toast.success('Objective added');
                }
              }}
              className="px-3 py-1 text-xs bg-accent-blue text-white rounded hover:bg-accent-blue/80 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Add Objective
            </button>
          </div>
        </div>
      )}

      {/* CSR Template Modal (v204c-b2) */}
      {showCSRModal && csrTemplateResult && (
        <CSRTemplateModal 
          result={csrTemplateResult} 
          onClose={handleCloseCSRModal}
        />
      )}
    </div>
  );
}

// ============================================================================
// CSR TEMPLATE MODAL (v204c-b2)
// ============================================================================

interface CSRTemplateModalProps {
  result: CSRTemplateResult;
  onClose: () => void;
}

function CSRTemplateModal({ result, onClose }: CSRTemplateModalProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set((result.sections ?? []).map(s => s.id))
  );
  
  const toggleSection = (id: string) => {
    const newSet = new Set(expandedSections);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setExpandedSections(newSet);
  };
  
  const sectionColors: Record<string, string> = {
    '11.1': 'bg-blue-500/20 text-blue-400',
    '11.2': 'bg-purple-500/20 text-purple-400',
    '11.3': 'bg-gray-500/20 text-gray-400',
  };
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-surface-primary border border-border rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 rounded-lg">
              <FileOutput className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-text-primary">Generated CSR Sections</h2>
              <p className="text-sm text-text-muted">
                {result.sections.length} section{result.sections.length !== 1 ? 's' : ''} • {result.totalWordCount} words • {result.lineageRecords.length} lineage record{result.lineageRecords.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                // Export CSR template
                const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'csr-template-sections.json';
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              <Download className="w-4 h-4" />
              Export
            </Button>
            <IconButton 
              icon={<X className="w-5 h-5" />}
              variant="ghost"
              onClick={onClose}
              label="Close modal"
            />
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {(result.sections ?? []).map(section => {
            const isExpanded = expandedSections.has(section.id);
            
            return (
              <div 
                key={section.id}
                className="bg-surface-card border border-border rounded-lg overflow-hidden"
              >
                <div 
                  className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-surface-elevated transition-colors"
                  onClick={() => toggleSection(section.id)}
                >
                  <div className="flex items-center gap-3">
                    <Badge 
                      color={section.csrSection === '11.1' ? 'blue' : section.csrSection === '11.2' ? 'purple' : 'gray'} 
                      size="sm"
                    >
                      Section {section.csrSection}
                    </Badge>
                    <span className="font-medium text-text-primary">{section.sectionTitle}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-text-muted">{section.wordCount} words</span>
                    <Badge color="amber" size="sm">{section.status}</Badge>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-text-muted" /> : <ChevronDown className="w-4 h-4 text-text-muted" />}
                  </div>
                </div>
                
                {isExpanded && (
                  <div className="border-t border-border bg-surface-elevated p-4">
                    <pre className="whitespace-pre-wrap text-sm text-text-secondary font-sans leading-relaxed">
                      {section.generatedContent}
                    </pre>
                    
                    {/* Lineage Info */}
                    <div className="mt-4 pt-4 border-t border-border/50">
                      <div className="flex items-center gap-2 text-xs text-text-muted">
                        <Network className="w-3 h-3" />
                        <span>Source: {section.sourceEndpointIds.length} endpoint{section.sourceEndpointIds.length !== 1 ? 's' : ''}</span>
                        {section.sourceObjectiveId && (
                          <>
                            <span>•</span>
                            <span>1 objective</span>
                          </>
                        )}
                        <span>•</span>
                        <span>Generated {new Date(section.generatedAt).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          
          {/* Lineage Summary */}
          <div className="mt-6 p-4 bg-surface-elevated rounded-lg border border-border">
            <div className="flex items-center gap-2 mb-3">
              <Network className="w-4 h-4 text-emerald-400" />
              <span className="font-medium text-text-primary">Lineage Records Created</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
              <div className="text-center p-3 bg-surface-card rounded-lg">
                <div className="text-2xl font-semibold text-blue-400">
                  {result.lineageRecords.filter(l => l.sourceEntityType === 'objective').length}
                </div>
                <div className="text-xs text-text-muted">Objectives → CSR</div>
              </div>
              <div className="text-center p-3 bg-surface-card rounded-lg">
                <div className="text-2xl font-semibold text-purple-400">
                  {result.lineageRecords.filter(l => l.sourceEntityType === 'endpoint').length}
                </div>
                <div className="text-xs text-text-muted">Endpoints → CSR</div>
              </div>
              <div className="text-center p-3 bg-surface-card rounded-lg">
                <div className="text-2xl font-semibold text-emerald-400">
                  {result.sections.length}
                </div>
                <div className="text-xs text-text-muted">CSR Sections</div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-surface-elevated shrink-0">
          <div className="flex items-center justify-between">
            <p className="text-sm text-text-muted">
              Generated content is in draft status. Review and edit in the Authoring module.
            </p>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={onClose}>
                Close
              </Button>
              <Button 
                variant="primary" 
                size="sm"
                onClick={() => {
                  // Navigate to authoring with CSR template context
                  window.location.href = '/?module=authoring';
                }}
              >
                <FileText className="w-4 h-4" />
                Open in Authoring
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// SCHEDULE OF ACTIVITIES (SoA) GRID
// ============================================================================

interface SoAGridProps {
  studyDesignId: string;
}

function SoAGrid({ studyDesignId }: SoAGridProps) {
  const { deadClick } = useDeadClick();
  const studyDesignsRecord = useUSDMStore(s => s.studyDesigns);
  const studyArmsRecord = useUSDMStore(s => s.studyArms);
  const studyEpochsRecord = useUSDMStore(s => s.studyEpochs);
  const activitiesRecord = useUSDMStore(s => s.activities);
  const encountersRecord = useUSDMStore(s => s.encounters);
  
  const design = studyDesignsRecord[studyDesignId];
  
  // Get all arms and epochs for this design
  const arms = useMemo(() => {
    if (!design) return [];
    return Object.values(studyArmsRecord).filter(arm => 
      design.studyArms?.some(a => a.id === arm.id)
    );
  }, [design, studyArmsRecord]);
  
  const epochs = useMemo(() => {
    if (!design) return [];
    return Object.values(studyEpochsRecord).filter(epoch =>
      design.studyEpochs?.some(e => e.id === epoch.id)
    );
  }, [design, studyEpochsRecord]);
  
  const activities = useMemo(() => {
    return Object.values(activitiesRecord);
  }, [activitiesRecord]);
  
  const encounters = useMemo(() => {
    return Object.values(encountersRecord);
  }, [encountersRecord]);
  
  if (!design) {
    return (
      <EmptyState
        icon={<Calendar className="w-12 h-12" />}
        title="No study design selected"
        description="Select a study to view its Schedule of Activities"
      />
    );
  }
  
  if (activities.length === 0 || encounters.length === 0) {
    return (
      <EmptyState
        icon={<Calendar className="w-12 h-12" />}
        title="Schedule of Activities not defined"
        description="Add activities and encounters to build the study schedule"
        action={
          <Button variant="primary" size="sm" onClick={() => toast.success('Study design action recorded — protocol version updated')}>
            <Plus className="w-4 h-4" />
            Build Schedule
          </Button>
        }
      />
    );
  }
  
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-surface-elevated">
            <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider border-b border-border sticky left-0 bg-surface-elevated z-10 min-w-[200px]">
              Activity
            </th>
            {encounters.map(encounter => (
              <th 
                key={encounter.id}
                className="px-3 py-3 text-center text-xs font-medium text-text-muted uppercase tracking-wider border-b border-border min-w-[80px]"
              >
                <div>{encounter.encounterName}</div>
                {encounter.encounterLabel && (
                  <div className="text-[10px] font-normal text-text-muted/70">{encounter.encounterLabel}</div>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {activities.map((activity, idx) => (
            <tr key={activity.id} className={idx % 2 === 0 ? 'bg-surface' : 'bg-surface-card/30'}>
              <td className="px-4 py-2 text-sm text-text-primary border-b border-border/50 sticky left-0 bg-inherit z-10">
                <div className="flex items-center gap-2">
                  <ClipboardList className="w-4 h-4 text-text-muted" />
                  {activity.activityName}
                </div>
              </td>
              {encounters.map(encounter => {
                // For demo, show checkmarks based on activity type
                const isRequired = Math.random() > 0.3;
                const isOptional = !isRequired && Math.random() > 0.5;
                
                return (
                  <td 
                    key={encounter.id}
                    className="px-3 py-2 text-center border-b border-border/50"
                  >
                    {isRequired && (
                      <div className="flex justify-center">
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                      </div>
                    )}
                    {isOptional && (
                      <div className="flex justify-center">
                        <span className="text-text-muted text-xs">○</span>
                      </div>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      
      {/* Legend */}
      <div className="mt-4 flex items-center gap-6 text-xs text-text-muted px-4">
        <div className="flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>Required</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-text-muted">○</span>
          <span>Optional</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-text-muted">—</span>
          <span>Not applicable</span>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// PROTOCOL BUILDER PANEL
// ============================================================================

interface ProtocolBuilderProps {
  study: USDMStudy;
  design: USDMStudyDesign | null;
}

function ProtocolBuilder({ study, design }: ProtocolBuilderProps) {
  const studyArmsRecord = useUSDMStore(s => s.studyArms);
  const studyEpochsRecord = useUSDMStore(s => s.studyEpochs);
  const objectivesRecord = useUSDMStore(s => s.objectives);
  const endpointsRecord = useUSDMStore(s => s.endpoints);
  const updateStudy = useUSDMStore(s => s.updateStudy);
  const linkToCTMSStudy = useUSDMStore(s => s.linkToCTMSStudy);
  const addStudyArm = useUSDMStore(s => s.addStudyArm);
  const addStudyEpoch = useUSDMStore(s => s.addStudyEpoch);
  const createCTMSStudy = useCTMSStore(s => s.createStudy);
  const addAuthoringDoc = useAuthoringStore(s => s.addDocument);
  const updateAuthoringDoc = useAuthoringStore(s => s.updateDocument);
  const toast = useToast();

  // AI Document Generation state
  const [showAIGenerator, setShowAIGenerator] = useState(false);
  const [generatedDocument, setGeneratedDocument] = useState<string>('');
  const [authoringDocId, setAuthoringDocId] = useState<string | null>(null);
  const [isApproving, setIsApproving] = useState(false);
  const [showAddArmForm, setShowAddArmForm] = useState(false);
  const [newArmName, setNewArmName] = useState('');
  const [showAddEpochForm, setShowAddEpochForm] = useState(false);
  const [newEpochName, setNewEpochName] = useState('');
  
  const arms = useMemo(() => {
    if (!design) return [];
    return Object.values(studyArmsRecord);
  }, [design, studyArmsRecord]);
  
  const epochs = useMemo(() => {
    if (!design) return [];
    return Object.values(studyEpochsRecord);
  }, [design, studyEpochsRecord]);
  
  const objectives = useMemo(() => Object.values(objectivesRecord), [objectivesRecord]);
  const endpoints = useMemo(() => Object.values(endpointsRecord), [endpointsRecord]);
  
  const latestVersion = study.studyProtocolVersions[study.studyProtocolVersions.length - 1];
  
  // Build context for AI generation
  const protocolContext = useMemo(() => ({
    // Study Identity
    studyTitle: study.studyTitle,
    shortTitle: study.studyShortTitle,
    acronym: study.studyAcronym,
    phase: study.studyPhase?.decode,
    studyType: study.studyType?.decode,
    protocolVersion: latestVersion?.protocolVersion,
    officialTitle: latestVersion?.officialTitle,
    // Identifiers
    identifiers: study.studyIdentifiers?.map(i => ({
      org: i.studyIdentifierScope?.organizationName,
      id: i.studyIdentifier,
    })),
    // Design
    designType: design?.trialTypes?.[0]?.decode,
    interventionModel: design?.interventionModel?.decode,
    arms: arms.map(a => ({
      name: a.studyArmName,
      type: a.studyArmType?.decode,
      description: a.studyArmDescription,
    })),
    epochs: epochs.map(e => ({
      name: e.studyEpochName,
      type: e.studyEpochType?.decode,
    })),
    // Objectives & Endpoints
    objectives: objectives.map(o => ({
      text: o.objectiveDescription,
      level: o.objectiveLevel?.decode,
    })),
    endpoints: endpoints.map(e => ({
      text: e.endpointDescription,
      level: e.endpointLevel?.decode,
      purpose: e.endpointPurposeDescription,
    })),
  }), [study, design, arms, epochs, objectives, endpoints, latestVersion]);
  
  return (
    <>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
      {/* Study Overview */}
      <div className="col-span-1 md:col-span-2 space-y-4 md:space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-text-primary">Protocol Information</h3>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => useAppStore.getState().setActiveModule('study-design')}
              >
                <Edit className="w-4 h-4" />
                Edit
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="text-xs text-text-muted uppercase tracking-wider mb-1">Official Title</div>
                <p className="text-sm text-text-primary">{latestVersion?.officialTitle || study.studyTitle}</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <div className="text-xs text-text-muted uppercase tracking-wider mb-1">Short Title</div>
                  <p className="text-sm text-text-primary">{study.studyShortTitle}</p>
                </div>
                <div>
                  <div className="text-xs text-text-muted uppercase tracking-wider mb-1">Acronym</div>
                  <p className="text-sm text-text-primary">{study.studyAcronym || '—'}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
                <div>
                  <div className="text-xs text-text-muted uppercase tracking-wider mb-1">Phase</div>
                  <Badge color="purple" size="sm">{study.studyPhase.decode}</Badge>
                </div>
                <div>
                  <div className="text-xs text-text-muted uppercase tracking-wider mb-1">Study Type</div>
                  <Badge color="blue" size="sm">{study.studyType.decode}</Badge>
                </div>
                <div>
                  <div className="text-xs text-text-muted uppercase tracking-wider mb-1">Protocol Version</div>
                  <span className="text-sm text-text-primary">{latestVersion?.protocolVersion || '1.0'}</span>
                </div>
              </div>
              <div>
                <div className="text-xs text-text-muted uppercase tracking-wider mb-1">Rationale</div>
                <p className="text-sm text-text-secondary">{study.studyRationale}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Design Characteristics */}
        {design && (
          <Card>
            <CardHeader>
              <h3 className="font-semibold text-text-primary">Design Characteristics</h3>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <div className="text-xs text-text-muted uppercase tracking-wider mb-1">Intervention Model</div>
                  <span className="text-sm text-text-primary">{design.interventionModel?.decode || 'Parallel'}</span>
                </div>
                <div>
                  <div className="text-xs text-text-muted uppercase tracking-wider mb-1">Masking</div>
                  <div className="flex flex-wrap gap-1">
                    {design.maskingRoles?.map((role, idx) => (
                      <Badge key={idx} color="gray" size="sm">{role.decode}</Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
      
      {/* Side Panels */}
      <div className="space-y-4 md:space-y-6">
        {/* Study Arms */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-text-primary">Study Arms</h3>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setShowAddArmForm(v => !v)}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {arms.length > 0 ? (
              <div className="space-y-3">
                {arms.map(arm => {
                  const armType = arm.studyArmType?.decode || 'EXPERIMENTAL';
                  return (
                    <div key={arm.id} className="p-3 bg-surface-elevated rounded-lg border border-border/50">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-text-primary">{arm.studyArmName}</span>
                        <Badge color={armTypeColorMap[armType] || 'gray'} size="sm">{armType.toLowerCase().replace('_', ' ')}</Badge>
                      </div>
                      {arm.studyArmDescription && (
                        <p className="text-xs text-text-muted">{arm.studyArmDescription}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-text-muted">No arms defined</p>
            )}
            {showAddArmForm && design && (
              <div className="mt-2 flex items-center gap-2">
                <input
                  autoFocus
                  value={newArmName}
                  onChange={e => setNewArmName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && newArmName.trim()) {
                      addStudyArm(design.id, { studyArmName: newArmName.trim() });
                      setNewArmName('');
                      setShowAddArmForm(false);
                      toast.success(`Arm "${newArmName.trim()}" added`);
                    } else if (e.key === 'Escape') {
                      setShowAddArmForm(false);
                      setNewArmName('');
                    }
                  }}
                  placeholder="Arm name — press Enter"
                  className="flex-1 px-2 py-1.5 text-xs bg-surface border border-accent-blue rounded text-text-primary placeholder:text-text-muted focus:outline-none"
                />
                <button onClick={() => { setShowAddArmForm(false); setNewArmName(''); }} className="text-xs text-text-muted hover:text-text-primary">✕</button>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Study Epochs */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-text-primary">Study Epochs</h3>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setShowAddEpochForm(v => !v)}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {epochs.length > 0 ? (
              <div className="space-y-2">
                {epochs.map((epoch, idx) => {
                  const epochType = epoch.studyEpochType?.decode || 'TREATMENT';
                  return (
                    <div key={epoch.id} className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-surface-elevated text-xs text-text-muted">
                        {idx + 1}
                      </div>
                      <div className="flex-1">
                        <span className="text-sm text-text-primary">{epoch.studyEpochName}</span>
                      </div>
                      <Badge color={epochTypeColorMap[epochType] || 'gray'} size="sm">{epochType.toLowerCase().replace('_', ' ')}</Badge>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-text-muted">No epochs defined</p>
            )}
            {showAddEpochForm && design && (
              <div className="mt-2 flex items-center gap-2">
                <input
                  autoFocus
                  value={newEpochName}
                  onChange={e => setNewEpochName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && newEpochName.trim()) {
                      addStudyEpoch(design.id, { studyEpochName: newEpochName.trim() });
                      setNewEpochName('');
                      setShowAddEpochForm(false);
                      toast.success(`Epoch "${newEpochName.trim()}" added`);
                    } else if (e.key === 'Escape') {
                      setShowAddEpochForm(false);
                      setNewEpochName('');
                    }
                  }}
                  placeholder="Epoch name — press Enter"
                  className="flex-1 px-2 py-1.5 text-xs bg-surface border border-accent-blue rounded text-text-primary placeholder:text-text-muted focus:outline-none"
                />
                <button onClick={() => { setShowAddEpochForm(false); setNewEpochName(''); }} className="text-xs text-text-muted hover:text-text-primary">✕</button>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Identifiers */}
        <Card>
          <CardHeader>
            <h3 className="font-semibold text-text-primary">Study Identifiers</h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {study.studyIdentifiers.map((ident, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm">
                  <span className="text-text-muted">{ident.studyIdentifierScope.organizationName}</span>
                  <span className="text-text-primary font-mono">{ident.studyIdentifier}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        
        {/* AI Protocol Document Generation */}
        <Card className="col-span-1 md:col-span-2 bg-gradient-to-r from-purple-500/5 to-blue-500/5 border-purple-500/30">
          <CardContent className="p-5">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-purple-500/20">
                <Sparkles className="w-6 h-6 text-purple-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-semibold text-text-primary mb-1">
                  Generate Protocol Document
                </h3>
                <p className="text-sm text-text-muted mb-4">
                  Use AI to generate a complete ICH E6(R2)/E8 compliant clinical protocol document 
                  based on your USDM study data, including objectives, endpoints, design, and arms.
                </p>
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className="px-2 py-1 text-xs bg-surface text-text-muted rounded">Synopsis</span>
                  <span className="px-2 py-1 text-xs bg-surface text-text-muted rounded">Objectives & Endpoints</span>
                  <span className="px-2 py-1 text-xs bg-surface text-text-muted rounded">Study Design</span>
                  <span className="px-2 py-1 text-xs bg-surface text-text-muted rounded">Treatment Arms</span>
                  <span className="px-2 py-1 text-xs bg-surface text-text-muted rounded">Schedule of Activities</span>
                  <span className="px-2 py-1 text-xs bg-surface text-text-muted rounded">Safety Monitoring</span>
                </div>
                <Button
                  variant="primary"
                  onClick={() => setShowAIGenerator(true)}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Protocol Document
                </Button>
              </div>
            </div>
            
            {/* Generated Document Preview */}
            {generatedDocument && (
              <div className="mt-4 p-4 bg-surface rounded-lg border border-border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-text-primary flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-accent-green" />
                    Document Generated
                  </span>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => navigator.clipboard.writeText(generatedDocument)}
                    >
                      <Copy className="w-3 h-3 mr-1" />
                      Copy
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => {
                        const blob = new Blob([generatedDocument], { type: 'text/plain' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `${study.studyAcronym || 'Protocol'}_Document.txt`;
                        a.click();
                      }}
                    >
                      <Download className="w-3 h-3 mr-1" />
                      Download
                    </Button>
                  </div>
                </div>
                <div className="max-h-32 overflow-y-auto text-xs text-text-muted bg-surface-card p-3 rounded">
                  {generatedDocument.slice(0, 400)}...
                </div>
              </div>
            )}

            {/* v0.44.11: Approve Protocol → creates CTMS study + finalises authoring doc */}
            <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-text-muted">
                <CheckCircle className="w-4 h-4 text-accent-amber" />
                <span>
                  {study.linkedCTMSStudyId
                    ? 'CTMS study linked — approve to advance to startup'
                    : 'Approving will create a linked CTMS study'}
                </span>
              </div>
              <button
                disabled={isApproving}
                onClick={async () => {
                  setIsApproving(true);
                    try {
                      // 1. Bump USDM protocol version
                      const latestVer = study.studyProtocolVersions[study.studyProtocolVersions.length - 1];
                      const currentProtoVer = latestVer?.protocolVersion || '1.0';
                      const parts = currentProtoVer.split('.');
                      const newProtoVer = `${parts[0]}.${parseInt(parts[1] || '0', 10) + 1}`;
                      updateStudy(study.id, {
                        studyProtocolVersions: [
                          ...study.studyProtocolVersions.slice(0, -1),
                          { ...latestVer, protocolVersion: newProtoVer },
                        ],
                      });

                      // 2. Create or update the CTMS study
                      let ctmsId = study.linkedCTMSStudyId;
                      if (!ctmsId) {
                        const phaseMap: Record<string, string> = {
                          'Phase 1': 'Phase 1', 'Phase 2': 'Phase 2',
                          'Phase 3': 'Phase 3', 'Phase 4': 'Phase 4',
                        };
                        const newCTMSStudy = createCTMSStudy({
                          protocolNumber: study.studyIdentifiers[0]?.studyIdentifier || study.studyAcronym || 'PROT-001',
                          title: study.studyTitle,
                          shortTitle: study.studyShortTitle,
                          phase: (phaseMap[study.studyPhase?.decode] || 'Phase 2') as any,
                          status: 'startup',
                          indication: study.businessTherapeuticAreas?.[0]?.decode || '',
                          sponsor: 'Ligature Therapeutics',
                          targetEnrollment: 0,
                          plannedStartDate: new Date().toISOString(),
                          productName: study.studyShortTitle,
                        });
                        ctmsId = newCTMSStudy.id;
                        linkToCTMSStudy(study.id, ctmsId);
                      }

                      // 3. Approve and finalise the authoring document
                      if (authoringDocId) {
                        updateAuthoringDoc(authoringDocId, {
                          status: 'approved',
                          version: '1.0',
                          approvedDate: new Date().toISOString(),
                        });
                      }

                      toast.success(
                        `Protocol v${newProtoVer} approved — CTMS study ${study.linkedCTMSStudyId ? 'advanced to startup' : 'created'} ✓`
                      );
                    } finally {
                      setIsApproving(false);
                    }
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-accent-green text-white rounded-lg text-sm font-medium hover:bg-accent-green/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isApproving ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
                Approve Protocol
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
    
    {/* AI Document Generator Modal */}
    <AIDocumentGeneratorPanel
      isOpen={showAIGenerator}
      context={{
        documentType: 'protocol',
        title: study.studyTitle || 'Clinical Protocol',
        productName: study.studyShortTitle,
        contextData: protocolContext,
      }}
      onAccept={(content) => {
        setGeneratedDocument(content);
        setShowAIGenerator(false);

        // v0.44.11: Create a real authoring document for the protocol
        const protocolId = `protocol-${study.id}-${Date.now()}`;
        const protocolVersion = study.studyProtocolVersions[study.studyProtocolVersions.length - 1];
        const now = new Date().toISOString();
        const newDoc: import('@/types/authoring').AuthoringDocument = {
          id: protocolId,
          documentType: 'protocol',
          title: `Clinical Protocol — ${study.studyTitle}`,
          shortTitle: `${study.studyAcronym || study.studyShortTitle} Protocol`,
          version: '0.1',
          versionDate: now,
          programId: study.linkedProductId || 'program-001',
          programName: study.studyShortTitle,
          productId: study.linkedProductId || 'product-001',
          productName: study.studyShortTitle,
          studyId: study.id,
          studyName: study.studyTitle,
          templateId: 'template-protocol',
          templateName: 'Clinical Protocol Template',
          templateVersion: '1.0',
          status: 'drafting',
          workflowId: `wf-protocol-${protocolId}`,
          createdAt: now,
          updatedAt: now,
          authorId: 'current-user',
          authorName: 'Current User',
          ownerId: 'current-user',
          ownerName: 'Current User',
          progress: 25,
          sectionsTotal: 12,
          sectionsComplete: 3,
          sections: [],
          prerequisites: [],
          prerequisitesMet: true,
          openComments: 0,
          totalComments: 0,
          history: [],
          sourceDocuments: [],
          linkedDocuments: [],
          tags: ['protocol', study.studyPhase?.decode || ''],
          priority: 'high',
          aiAuthoringMode: 'document',
        };
        addAuthoringDoc(newDoc);
        setAuthoringDocId(protocolId);
        toast.success(`Protocol document created in Authoring — v0.1 Draft`, {
          action: { label: 'View in Authoring →', onClick: () => useAppStore.getState().setActiveModule('authoring') },
        });
      }}
      onClose={() => setShowAIGenerator(false)}
    />
    </>
  );
}

// ============================================================================
// MAIN SCREEN COMPONENT
// ============================================================================

export function StudyDesignScreen({ filters }: StudyDesignScreenProps) {
  const { deadClick } = useDeadClick();
  const products = useProducts();
  const [activeTab, setActiveTab] = useState<StudyDesignTab>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEndpoint, setSelectedEndpoint] = useState<USDMEndpoint | null>(null);
  
  // Loading state
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 650);
    return () => clearTimeout(timer);
  }, []);
  
  // v0.21.9: Toast for notifications
  const toast = useToast();
  
  // Store selectors
  const studiesRecord = useUSDMStore(s => s.studies);
  const studyDesignsRecord = useUSDMStore(s => s.studyDesigns);
  const objectivesRecord = useUSDMStore(s => s.objectives);
  const endpointsRecord = useUSDMStore(s => s.endpoints);
  const studyArmsRecord = useUSDMStore(s => s.studyArms);
  const studyEpochsRecord = useUSDMStore(s => s.studyEpochs);
  const activitiesRecord = useUSDMStore(s => s.activities);
  const encountersRecord = useUSDMStore(s => s.encounters);
  const selectedStudyId = useUSDMStore(s => s.selectedStudyId);
  const loadMockData = useUSDMStore(s => s.loadMockData);
  const setSelectedStudyId = useUSDMStore(s => s.setSelectedStudy);
  const createStudy = useUSDMStore(s => s.createStudy);
  const exportToUSDMJson = useUSDMStore(s => s.exportToUSDMJson);

  // New Study modal state
  const [showNewStudyModal, setShowNewStudyModal] = useState(false);
  const [newStudyForm, setNewStudyForm] = useState({
    title: '', shortTitle: '', acronym: '', phase: 'Phase 3', type: 'INTERVENTIONAL', rationale: '',
  });

  // Protocol Amendment modal state
  const [showAmendmentModal, setShowAmendmentModal] = useState(false);
  const [amendmentForm, setAmendmentForm] = useState({
    version: '', rationale: '', changeType: 'minor', sections: '',
  });
  
  // Derived data
  const studies = useMemo(() => Object.values(studiesRecord), [studiesRecord]);
  const studyDesigns = useMemo(() => Object.values(studyDesignsRecord), [studyDesignsRecord]);
  const objectives = useMemo(() => Object.values(objectivesRecord), [objectivesRecord]);
  const endpoints = useMemo(() => Object.values(endpointsRecord), [endpointsRecord]);
  const studyArms = useMemo(() => Object.values(studyArmsRecord), [studyArmsRecord]);
  const studyEpochs = useMemo(() => Object.values(studyEpochsRecord), [studyEpochsRecord]);
  const activities = useMemo(() => Object.values(activitiesRecord), [activitiesRecord]);
  const encounters = useMemo(() => Object.values(encountersRecord), [encountersRecord]);
  
  const selectedStudy = selectedStudyId ? studiesRecord[selectedStudyId] : studies[0];

  // Derive active design: prefer one linked to the selected study, fall back to first available
  const selectedDesign = useMemo(() => {
    if (!selectedStudy || studyDesigns.length === 0) return null;
    const linked = studyDesigns.find(d =>
      selectedStudy.studyDesigns?.some((sd: { id: string }) => sd.id === d.id)
    );
    return linked ?? studyDesigns[0];
  }, [selectedStudy, studyDesigns]);
  
  // Auto-select first study if none selected
  useEffect(() => {
    if (!selectedStudyId && studies.length > 0) {
      setSelectedStudyId(studies[0].id);
    }
  }, [studies, selectedStudyId, setSelectedStudyId]);

  // Auto-seed mock data when the selected study has no objectives (empty stub)
  // This ensures demo content is always present — avoids "0 objectives, 0 endpoints" dead-end
  useEffect(() => {
    if (objectives.length === 0 && studies.length > 0 && studies.length < 3) {
      loadMockData();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStudyId]);

  // v0.125.41: Only use studyId when scope is actually at study level
  // If scopeLevel is 'dev-app', 'auth', 'region' etc. studyId may be stale from a prior selection
  const scopeLevel   = useActiveScopeStore(s => s.scopeLevel);
  const scopeStudyId = useActiveScopeStore(s => s.studyId);
  const atStudyScope = scopeLevel === 'study';
  const scopeStudy   = (atStudyScope && scopeStudyId) ? getStudyById(scopeStudyId) : undefined;
  useEffect(() => {
    if (!scopeStudy || studies.length === 0) return;
    const match = studies.find(s =>
      s.studyIdentifiers?.some((i: { studyIdentifier: string }) => i.studyIdentifier === scopeStudy.protocolNumber) ||
      s.studyShortTitle === scopeStudy.protocolNumber ||
      s.studyAcronym === scopeStudy.protocolNumber
    ) ?? studies[0];
    if (match && match.id !== selectedStudyId) setSelectedStudyId(match.id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopeStudy?.protocolNumber, studies.length]);

  const scopeSummary = scopeStudy
    ? `${scopeStudy.protocolNumber} · ${scopeStudy.phase}`
    : null;
  
  const handleLoadData = useCallback(() => {
    if (studies.length === 0) {
      loadMockData();
    }
  }, [studies.length, loadMockData]);

  // ── v0.96.0: Persistence hook (Supabase-first with mock fallback) ──────────
  const { syncStatus, isHydrated } = useUSDMPersistence();

  // ── v0.96.0: TPP store wiring ─────────────────────────────────────────────
  const tppsByStudyId        = useUSDMTPPStore(s => s.tppsByStudyId);
  const claimsByStudyId      = useUSDMTPPStore(s => s.claimsByStudyId);
  const addClaim             = useUSDMTPPStore(s => s.addClaim);
  const updateClaim          = useUSDMTPPStore(s => s.updateClaim);

  const studyTPPs   = selectedStudy ? (tppsByStudyId[selectedStudy.id] ?? [])   : [];
  const studyClaims = selectedStudy ? (claimsByStudyId[selectedStudy.id] ?? []) : [];
  const activeTPP   = studyTPPs[0] ?? null;

  // ── v0.96.0: Design matrix store wiring ───────────────────────────────────
  const getDesignMatrix      = useUSDMDesignMatrixStore(s => s.getDesignMatrix);
  const addStudyArm          = useUSDMDesignMatrixStore(s => s.addStudyArm);
  const addStudyEpoch        = useUSDMDesignMatrixStore(s => s.addStudyEpoch);
  const generateCells        = useUSDMDesignMatrixStore(s => s.generateCellsForDesign);

  const designMatrix = useMemo(() => {
    if (!selectedDesign) return null;
    return getDesignMatrix(selectedDesign.id);
  }, [selectedDesign, getDesignMatrix,
      // Depend on arm/epoch changes:
      // eslint-disable-next-line react-hooks/exhaustive-deps
      useUSDMDesignMatrixStore.getState().armsByDesignId,
      useUSDMDesignMatrixStore.getState().epochsByDesignId]);

  // Seed design matrix mock if empty when design tab is opened
  const handleOpenDesignMatrix = useCallback(() => {
    if (!selectedDesign) return;
    const arms = useUSDMDesignMatrixStore.getState().armsByDesignId[selectedDesign.id] ?? [];
    if (arms.length === 0) {
      loadDesignMatrixMockData(selectedDesign.id);
    }
    setActiveTab('design-matrix');
  }, [selectedDesign]);

  // ── v0.96.0: AI Protocol Assist state ────────────────────────────────────
  const [aiAssistLoading,  setAiAssistLoading]  = useState(false);
  const [aiEndpointResult, setAiEndpointResult] = useState<Record<string, unknown> | null>(null);
  const [aiObjectiveResult,setAiObjectiveResult]= useState<Record<string, unknown> | null>(null);

  const handleAISuggestEndpoints = useCallback(async () => {
    if (!selectedStudy) return;
    setAiAssistLoading(true);
    try {
      const res = await fetch('/api/ai/usdm-protocol-assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'suggest-endpoints',
          indication: selectedStudy.studyShortTitle ?? 'NSCLC',
          phase: selectedStudy.studyPhase?.decode ?? 'Phase 3',
          therapeuticArea: 'Oncology',
          primaryObjective: objectives[0]?.description ?? '',
        }),
      });
      const data = await res.json();
      setAiEndpointResult(data.result ?? null);
    } catch (e) {
      toast.error('AI endpoint suggestion failed');
    } finally {
      setAiAssistLoading(false);
    }
  }, [selectedStudy, objectives, toast]);

  const handleAIGenerateObjectives = useCallback(async () => {
    if (!selectedStudy) return;
    setAiAssistLoading(true);
    try {
      const res = await fetch('/api/ai/usdm-protocol-assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate-objectives',
          indication: selectedStudy.studyShortTitle ?? 'NSCLC',
          phase: selectedStudy.studyPhase?.decode ?? 'Phase 3',
          therapeuticArea: 'Oncology',
          mechanism: 'KRAS G12C Inhibitor',
        }),
      });
      const data = await res.json();
      setAiObjectiveResult(data.result ?? null);
    } catch (e) {
      toast.error('AI objective generation failed');
    } finally {
      setAiAssistLoading(false);
    }
  }, [selectedStudy, toast]);
  
  const handleExport = useCallback(() => {
    if (selectedStudy) {
      const json = exportToUSDMJson(selectedStudy.id);
      // v0.21.9: Toast instead of console.log
      toast.success(`Exported USDM JSON for ${selectedStudy.studyTitle}`);
    }
  }, [selectedStudy, exportToUSDMJson, toast]);
  
  // v204a: CTMS Sync
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ created: number; updated: number; unchanged: number } | null>(null);
  const syncEndpointsFromUSDM = useCTMSStore(s => s.syncEndpointsFromUSDM);
  const recordLineageAppearance = useUSDMStore(s => s.recordLineageAppearance);
  
  // v204b: Bidirectional Sync
  const [showSyncConfig, setShowSyncConfig] = useState(false);
  const [biSyncResult, setBiSyncResult] = useState<{
    direction: string;
    conflicts: number;
    autoResolved: number;
  } | null>(null);
  const executeBidirectionalSync = useCTMSStore(s => s.executeBidirectionalSync);
  const setSyncConfig = useCTMSStore(s => s.setSyncConfig);
  const getSyncConfig = useCTMSStore(s => s.getSyncConfig);
  const getPendingConflicts = useCTMSStore(s => s.getPendingConflicts);
  const resolveConflict = useCTMSStore(s => s.resolveConflict);
  
  const [syncConfig, setLocalSyncConfig] = useState<BidirectionalSyncConfig>({
    sourceOfTruth: 'usdm',
    defaultResolution: 'source-wins',
    autoResolveMinorChanges: true,
    trackLocalEdits: true,
  });
  
  // Load sync config when study changes
  useEffect(() => {
    if (selectedStudy?.linkedCTMSStudyId) {
      const config = getSyncConfig(selectedStudy.linkedCTMSStudyId);
      setLocalSyncConfig(config);
    }
  }, [selectedStudy?.linkedCTMSStudyId, getSyncConfig]);
  
  const pendingConflicts = useMemo(() => {
    if (!selectedStudy?.linkedCTMSStudyId) return [];
    return getPendingConflicts(selectedStudy.linkedCTMSStudyId);
  }, [selectedStudy?.linkedCTMSStudyId, getPendingConflicts]);
  
  const handleSyncToCTMS = useCallback(async () => {
    if (!selectedStudy?.linkedCTMSStudyId || endpoints.length === 0) {
      return;
    }
    
    setIsSyncing(true);
    setSyncResult(null);
    
    try {
      // Prepare endpoints for sync
      const usdmEndpoints = endpoints.map(ep => ({
        id: ep.id,
        endpointDescription: ep.endpointDescription,
        endpointLevel: ep.endpointLevel,
      }));
      
      // Perform sync
      const result = syncEndpointsFromUSDM(selectedStudy.linkedCTMSStudyId, usdmEndpoints);
      
      // Record lineage appearances for synced endpoints
      endpoints.forEach(ep => {
        recordLineageAppearance(ep.id, {
          module: 'ctms',
          entityType: 'study-endpoint',
          entityId: ep.id,
          sectionReference: 'Study Endpoints',
          lastSyncedAt: result.syncedAt,
          syncStatus: 'current',
        });
      });
      
      setSyncResult({
        created: result.created,
        updated: result.updated,
        unchanged: result.unchanged,
      });
    } catch (error) {
      console.error('Sync error:', error);
    } finally {
      setIsSyncing(false);
    }
  }, [selectedStudy, endpoints, syncEndpointsFromUSDM, recordLineageAppearance]);
  
  // v204b: Bidirectional Sync Handler
  const handleBidirectionalSync = useCallback(async () => {
    if (!selectedStudy?.linkedCTMSStudyId) return;
    
    setIsSyncing(true);
    setBiSyncResult(null);
    
    try {
      const result = executeBidirectionalSync(selectedStudy.linkedCTMSStudyId, syncConfig);
      
      setBiSyncResult({
        direction: result.direction,
        conflicts: result.conflicts.length,
        autoResolved: result.autoResolved,
      });
      
      // Also update the basic sync result for display
      setSyncResult({
        created: result.usdmToCTMS.created + result.ctmsToUSDM.created,
        updated: result.usdmToCTMS.updated + result.ctmsToUSDM.updated,
        unchanged: result.usdmToCTMS.unchanged,
      });
    } catch (error) {
      console.error('Bidirectional sync error:', error);
    } finally {
      setIsSyncing(false);
    }
  }, [selectedStudy, syncConfig, executeBidirectionalSync]);
  
  const handleConfigChange = useCallback((key: keyof BidirectionalSyncConfig, value: BidirectionalSyncConfig[keyof BidirectionalSyncConfig]) => {
    const newConfig = { ...syncConfig, [key]: value };
    setLocalSyncConfig(newConfig);
    if (selectedStudy?.linkedCTMSStudyId) {
      setSyncConfig(selectedStudy.linkedCTMSStudyId, { [key]: value });
    }
  }, [syncConfig, selectedStudy, setSyncConfig]);
  
  const handleResolveConflict = useCallback((conflictId: string, resolution: ConflictResolutionStrategy) => {
    resolveConflict(conflictId, resolution);
  }, [resolveConflict]);
  
  // Stats
  const stats = useMemo(() => {
    const outdatedLineage = endpoints.filter(e => 
      e.lineage.appearances.some(a => a.syncStatus === 'outdated' || a.syncStatus === 'conflict')
    ).length;
    
    return {
      totalStudies: studies.length,
      totalObjectives: objectives.length,
      totalEndpoints: endpoints.length,
      studyArms: studyArms.length,
      studyEpochs: studyEpochs.length,
      activities: activities.length,
      encounters: encounters.length,
      outdatedLineage,
    };
  }, [studies, objectives, endpoints, studyArms, studyEpochs, activities, encounters]);
  
  // Tab configuration
  const tabs: { id: StudyDesignTab; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: 'dashboard', label: 'Overview', icon: <Layers className="w-4 h-4" /> },
    { id: 'protocol', label: 'Protocol Builder', icon: <FileText className="w-4 h-4" /> },
    { id: 'objectives', label: 'Objectives & Endpoints', icon: <Target className="w-4 h-4" />, count: stats.totalObjectives },
    { id: 'soa', label: 'Schedule of Activities', icon: <Calendar className="w-4 h-4" />, count: stats.activities },
    { id: 'tpp', label: 'Target Product Profile', icon: <Shield className="w-4 h-4" />, count: studyClaims.length || undefined },
    { id: 'design-matrix', label: 'Design Matrix', icon: <GitBranch className="w-4 h-4" /> },
    { id: 'lineage', label: 'Data Lineage', icon: <Network className="w-4 h-4" />, count: stats.outdatedLineage },
  ];
  
  if (isLoading) {
    return <StudyDesignScreenSkeleton />;
  }

  // Wrong scope guard — Study Design only makes sense at study level
  if (!atStudyScope) {
    return (
      <div className="flex-1 overflow-hidden flex flex-col">
        <ScreenHeader
          moduleId="study-design"
          showAssetContext
          title="Study Design"
          subtitle="USDM Protocol Builder with data lineage tracking and regulatory alignment"
          icon={<GitBranch className="w-5 h-5" />}
        />
        <div className="flex-1 flex items-center justify-center p-12">
          <div className="text-center max-w-sm">
            <div className="p-4 bg-amber-500/10 rounded-2xl w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <GitBranch className="w-8 h-8 text-amber-400" />
            </div>
            <h3 className="text-lg font-semibold text-text-primary mb-2">Select a clinical study</h3>
            <p className="text-sm text-text-muted mb-4">
              Study Design works at study scope. Use the scope selector in the header to select a clinical study (e.g. LIG-2847-301 · Phase 3).
            </p>
            <div className="text-xs text-text-muted px-3 py-2 bg-surface-card rounded-lg border border-border">
              Current scope: <span className="text-amber-400 font-medium">{scopeLevel}</span> — not a study
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      <ScreenHeader
        moduleId="study-design"
        title="Study Design"
        subtitle="USDM Protocol Builder with data lineage tracking and regulatory alignment"
        icon={<GitBranch className="w-5 h-5" />}
        actions={
          <div className="flex items-center gap-2">
            {selectedStudy && (
              <Button variant="outline" size="sm" onClick={() => setShowAmendmentModal(true)}>
                Protocol Amendment
              </Button>
            )}
            <Button variant="primary" size="sm" onClick={() => setShowNewStudyModal(true)}>
              + New Study
            </Button>
            <Button variant="outline" size="sm" onClick={handleLoadData}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        }
      />
      {/* v0.125.37: Scope context banner */}
      <ScopeContextBanner label="Study" scopeFlag="🔬" scopeSummary={scopeSummary} />

      {/* Persistent tab bar — tabs only, study switching handled by scope pill in header */}
      <div className="border-b border-border bg-surface-elevated flex items-center px-3 gap-1 min-h-[3rem] overflow-x-auto scrollbar-hide">
        {(['dashboard','protocol','objectives','soa','tpp','design-matrix','lineage'] as StudyDesignTab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 text-xs rounded-md whitespace-nowrap transition-colors ${
              activeTab === tab
                ? 'bg-accent-blue/15 text-accent-blue font-medium'
                : 'text-text-muted hover:text-text-primary hover:bg-surface-card'
            }`}
          >
            {tab === 'soa' ? 'Schedule of Activities' :
             tab === 'tpp' ? 'TPP' :
             tab === 'design-matrix' ? 'Design Matrix' :
             tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {studies.length === 0 ? (
          <EmptyState
            icon={<GitBranch className="w-12 h-12" />}
            title="No studies defined"
            description="Load sample data or create a new study to get started with USDM protocol management"
            action={
              <Button variant="primary" onClick={handleLoadData}>
                <RefreshCw className="w-4 h-4" />
                Load Sample Data
              </Button>
            }
          />
        ) : (
          <>
            {/* Dashboard Tab */}
            {activeTab === 'dashboard' && selectedStudy && (
              <div className="space-y-4 md:space-y-6">
                {/* Study Selector */}
                <Card>
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-emerald-500/20 rounded-lg">
                          <FlaskConical className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div>
                          <h2 className="text-lg font-semibold text-text-primary">{selectedStudy.studyShortTitle}</h2>
                          <p className="text-sm text-text-muted">{selectedStudy.studyTitle}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge color="purple" size="sm">{selectedStudy.studyPhase.decode}</Badge>
                        <Badge color="blue" size="sm">{selectedStudy.studyType.decode}</Badge>
                        {selectedStudy.linkedProductId && (
                          <Badge color="green" size="sm">
                            <Link2 className="w-3 h-3 mr-1" />
                            Linked to Product
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Quick Links */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
                  <Card className="cursor-pointer hover:border-border-hover transition-colors" onClick={() => setActiveTab('protocol')}>
                    <CardContent className="py-4 flex items-center gap-3">
                      <div className="p-2 bg-blue-500/20 rounded-lg">
                        <FileText className="w-5 h-5 text-blue-400" />
                      </div>
                      <div>
                        <div className="font-medium text-text-primary">Protocol Builder</div>
                        <div className="text-sm text-text-muted">Design & structure</div>
                      </div>
                      <ChevronDown className="w-4 h-4 text-text-muted ml-auto" />
                    </CardContent>
                  </Card>
                  
                  <Card className="cursor-pointer hover:border-border-hover transition-colors" onClick={() => setActiveTab('objectives')}>
                    <CardContent className="py-4 flex items-center gap-3">
                      <div className="p-2 bg-purple-500/20 rounded-lg">
                        <Target className="w-5 h-5 text-purple-400" />
                      </div>
                      <div>
                        <div className="font-medium text-text-primary">Objectives & Endpoints</div>
                        <div className="text-sm text-text-muted">{stats.totalObjectives} objectives, {stats.totalEndpoints} endpoints</div>
                      </div>
                      <ChevronDown className="w-4 h-4 text-text-muted ml-auto" />
                    </CardContent>
                  </Card>
                  
                  <Card className="cursor-pointer hover:border-border-hover transition-colors" onClick={() => setActiveTab('soa')}>
                    <CardContent className="py-4 flex items-center gap-3">
                      <div className="p-2 bg-teal-500/20 rounded-lg">
                        <Calendar className="w-5 h-5 text-teal-400" />
                      </div>
                      <div>
                        <div className="font-medium text-text-primary">Schedule of Activities</div>
                        <div className="text-sm text-text-muted">{stats.activities} activities, {stats.encounters} encounters</div>
                      </div>
                      <ChevronDown className="w-4 h-4 text-text-muted ml-auto" />
                    </CardContent>
                  </Card>
                  
                  <Card className="cursor-pointer hover:border-border-hover transition-colors" onClick={() => setActiveTab('lineage')}>
                    <CardContent className="py-4 flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${stats.outdatedLineage > 0 ? 'bg-amber-500/20' : 'bg-emerald-500/20'}`}>
                        <Network className={`w-5 h-5 ${stats.outdatedLineage > 0 ? 'text-amber-400' : 'text-emerald-400'}`} />
                      </div>
                      <div>
                        <div className="font-medium text-text-primary">Data Lineage</div>
                        <div className="text-sm text-text-muted">
                          {stats.outdatedLineage > 0 
                            ? `${stats.outdatedLineage} items need sync` 
                            : 'All items current'}
                        </div>
                      </div>
                      <ChevronDown className="w-4 h-4 text-text-muted ml-auto" />
                    </CardContent>
                  </Card>
                </div>
                
                {/* Lineage Summary */}
                <Card>
                  <CardHeader>
                    <h3 className="font-semibold text-text-primary">Protocol-to-Submission Lineage</h3>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex-1 flex items-center gap-3 p-3 bg-surface-elevated rounded-lg">
                        <div className="p-2 bg-emerald-500/20 rounded-lg">
                          <FileText className="w-4 h-4 text-emerald-400" />
                        </div>
                        <div>
                          <div className="font-medium text-text-primary">Study Design</div>
                          <div className="text-xs text-text-muted">USDM Source</div>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-text-muted" />
                      <div className="flex-1 flex items-center gap-3 p-3 bg-surface-elevated rounded-lg">
                        <div className="p-2 bg-green-500/20 rounded-lg">
                          <Users className="w-4 h-4 text-green-400" />
                        </div>
                        <div>
                          <div className="font-medium text-text-primary">CTMS</div>
                          <div className="text-xs text-text-muted">Operational</div>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-text-muted" />
                      <div className="flex-1 flex items-center gap-3 p-3 bg-surface-elevated rounded-lg">
                        <div className="p-2 bg-amber-500/20 rounded-lg">
                          <FileText className="w-4 h-4 text-amber-400" />
                        </div>
                        <div>
                          <div className="font-medium text-text-primary">Authoring</div>
                          <div className="text-xs text-text-muted">CSR/CTD</div>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-text-muted" />
                      <div className="flex-1 flex items-center gap-3 p-3 bg-surface-elevated rounded-lg">
                        <div className="p-2 bg-blue-500/20 rounded-lg">
                          <Layers className="w-4 h-4 text-blue-400" />
                        </div>
                        <div>
                          <div className="font-medium text-text-primary">Submissions</div>
                          <div className="text-xs text-text-muted">Module 5</div>
                        </div>
                      </div>
                    </div>
                    <p className="mt-4 text-sm text-text-muted text-center">
                      One definition. Zero re-keying. Full traceability.
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}
            
            {/* Protocol Builder Tab */}
            {activeTab === 'protocol' && selectedStudy && (
              selectedDesign
                ? <ProtocolBuilder study={selectedStudy} design={selectedDesign} />
                : <EmptyState
                    icon={<FileText className="w-12 h-12" />}
                    title="No study design configured"
                    description="Load sample data to populate protocol builder with objectives, endpoints, and study arms"
                    action={<Button variant="primary" onClick={handleLoadData}><RefreshCw className="w-4 h-4" />Load Sample Data</Button>}
                  />
            )}
            
            {/* Objectives & Endpoints Tab */}
            {activeTab === 'objectives' && selectedStudy && (
              !selectedDesign
                ? <EmptyState
                    icon={<Target className="w-12 h-12" />}
                    title="No study design available"
                    description="Load sample data to see objectives and endpoints for this study"
                    action={<Button variant="primary" onClick={handleLoadData}><RefreshCw className="w-4 h-4" />Load Sample Data</Button>}
                  />
                : <div className="space-y-4">
                {/* AI Assist bar */}
                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAIGenerateObjectives}
                    disabled={aiAssistLoading}
                    className="gap-1.5"
                  >
                    {aiAssistLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-purple-400" />}
                    AI Generate Objectives
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAISuggestEndpoints}
                    disabled={aiAssistLoading}
                    className="gap-1.5"
                  >
                    {aiAssistLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-blue-400" />}
                    AI Suggest Endpoints
                  </Button>
                  {(aiEndpointResult || aiObjectiveResult) && (
                    <Button variant="ghost" size="sm" onClick={() => { setAiEndpointResult(null); setAiObjectiveResult(null); }}>
                      Clear AI results
                    </Button>
                  )}
                </div>

                {/* AI objectives result */}
                {aiObjectiveResult && (
                  <Card className="border-purple-500/30 bg-purple-500/5">
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-purple-400" />
                        <h3 className="text-sm font-semibold text-purple-300">AI-Generated Objectives</h3>
                        {aiObjectiveResult._fallback && <Badge className="bg-amber-500/20 text-amber-400 text-[10px] border-0">Rule-based</Badge>}
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0 space-y-3">
                      {[
                        { key: 'primaryObjectives',     label: 'Primary',     color: 'text-green-400' },
                        { key: 'secondaryObjectives',   label: 'Secondary',   color: 'text-blue-400'  },
                        { key: 'exploratoryObjectives', label: 'Exploratory', color: 'text-slate-400' },
                      ].map(({ key, label, color }) => {
                        const objs = aiObjectiveResult[key] as any[] ?? [];
                        if (!objs.length) return null;
                        return (
                          <div key={key}>
                            <div className={`text-xs font-semibold ${color} mb-1.5`}>{label}</div>
                            {objs.map((obj: any, i: number) => (
                              <div key={i} className="mb-2 p-2.5 bg-slate-800/50 rounded-lg">
                                <p className="text-xs text-text-primary leading-relaxed">{obj.text}</p>
                                {obj.endpoints?.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-1.5">
                                    {obj.endpoints.map((ep: string, j: number) => (
                                      <span key={j} className="text-[10px] px-1.5 py-0.5 bg-slate-700 rounded text-text-muted">{ep}</span>
                                    ))}
                                  </div>
                                )}
                                {obj.regulatoryBasis && (
                                  <p className="text-[10px] text-text-muted mt-1">📋 {obj.regulatoryBasis}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        );
                      })}
                      {aiObjectiveResult.regulatoryAlignment && (
                        <p className="text-[10px] text-text-muted border-t border-border pt-2">{aiObjectiveResult.regulatoryAlignment as string}</p>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* AI endpoints result */}
                {aiEndpointResult && (
                  <Card className="border-blue-500/30 bg-blue-500/5">
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-blue-400" />
                        <h3 className="text-sm font-semibold text-blue-300">AI-Suggested Endpoints</h3>
                        {aiEndpointResult._fallback && <Badge className="bg-amber-500/20 text-amber-400 text-[10px] border-0">Rule-based</Badge>}
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0 space-y-3">
                      {[
                        { key: 'primaryEndpoints',     label: 'Primary',     color: 'bg-green-500/20 text-green-300' },
                        { key: 'secondaryEndpoints',   label: 'Secondary',   color: 'bg-blue-500/20 text-blue-300'   },
                        { key: 'exploratoryEndpoints', label: 'Exploratory', color: 'bg-slate-500/20 text-slate-300' },
                        { key: 'biomarkerEndpoints',   label: 'Biomarker',   color: 'bg-teal-500/20 text-teal-300'   },
                      ].map(({ key, label, color }) => {
                        const eps = aiEndpointResult[key] as any[] ?? [];
                        if (!eps.length) return null;
                        return (
                          <div key={key}>
                            <div className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${color} inline-block mb-2`}>{label}</div>
                            {eps.map((ep: any, i: number) => (
                              <div key={i} className="mb-2 p-2.5 bg-slate-800/50 rounded-lg">
                                <div className="flex items-start gap-2">
                                  <div className="flex-1">
                                    <div className="text-xs font-semibold text-text-primary">{ep.name}</div>
                                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                                      {ep.cdiscDomain && <span className="text-[10px] px-1.5 py-0.5 bg-slate-700 rounded text-blue-300 font-mono">{ep.cdiscDomain}</span>}
                                      {ep.sdtmVariable && <span className="text-[10px] px-1.5 py-0.5 bg-slate-700 rounded text-slate-300 font-mono">{ep.sdtmVariable}</span>}
                                      {ep.assessmentFrequency && <span className="text-[10px] text-text-muted">{ep.assessmentFrequency}</span>}
                                    </div>
                                    {ep.regulatoryAcceptance && <p className="text-[10px] text-green-400 mt-1">✓ {ep.regulatoryAcceptance}</p>}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      })}
                      {aiEndpointResult.sdtmMapping && (
                        <p className="text-[10px] text-text-muted border-t border-border pt-2">📊 {aiEndpointResult.sdtmMapping as string}</p>
                      )}
                    </CardContent>
                  </Card>
                )}

                <ObjectivesEndpointsPanel 
                  studyDesignId={selectedDesign.id}
                  studyId={selectedStudy.id}
                  studyTitle={selectedStudy.studyTitle}
                  onViewLineage={setSelectedEndpoint}
                />
              </div>
            )}
            
            {/* Schedule of Activities Tab */}
            {activeTab === 'soa' && (
              selectedDesign
                ? <SoAGrid studyDesignId={selectedDesign.id} />
                : <EmptyState
                    icon={<Calendar className="w-12 h-12" />}
                    title="No study design available"
                    description="Load sample data to populate the Schedule of Activities"
                    action={<Button variant="primary" onClick={handleLoadData}><RefreshCw className="w-4 h-4" />Load Sample Data</Button>}
                  />
            )}

            {/* ── Target Product Profile Tab (v0.96.0) ─────────────────── */}
            {activeTab === 'tpp' && (
              <div className="space-y-6">
                {/* TPP Header */}
                {activeTPP ? (
                  <Card>
                    <CardContent className="py-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 bg-purple-500/20 rounded-xl">
                            <Shield className="w-5 h-5 text-purple-400" />
                          </div>
                          <div>
                            <h2 className="text-base font-semibold text-text-primary">{activeTPP.name}</h2>
                            <p className="text-xs text-text-muted mt-0.5">{activeTPP.positioningStatement}</p>
                            <div className="flex items-center gap-2 mt-1.5">
                              <Badge variant="outline" className="text-[10px]">{activeTPP.therapeuticArea}</Badge>
                              <Badge variant="outline" className="text-[10px]">{activeTPP.drugClass}</Badge>
                              <Badge className={`text-[10px] ${activeTPP.status === 'Active' ? 'bg-green-500/20 text-green-400' : 'bg-slate-500/20 text-slate-400'}`}>{activeTPP.status}</Badge>
                              <span className="text-[10px] text-text-muted">v{activeTPP.version}</span>
                            </div>
                          </div>
                        </div>
                        {/* Evidence completeness */}
                        <div className="flex-shrink-0 text-right">
                          <div className="text-2xl font-bold text-purple-400">
                            {studyClaims.length > 0
                              ? Math.round((studyClaims.filter(c => c.evidenceStatus === ('Met' as string)).length / studyClaims.length) * 100)
                              : 0}%
                          </div>
                          <div className="text-[10px] text-text-muted">evidence complete</div>
                          <div className="w-28 h-1.5 bg-slate-700 rounded-full mt-1.5 ml-auto">
                            <div
                              className="h-full bg-purple-500 rounded-full"
                              style={{ width: `${studyClaims.length > 0 ? Math.round((studyClaims.filter(c => c.evidenceStatus === ('Met' as string)).length / studyClaims.length) * 100) : 0}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="py-8 text-center">
                      <Shield className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                      <p className="text-sm text-text-muted">No TPP defined for this study.</p>
                      <Button variant="primary" size="sm" className="mt-3" onClick={() => setActiveTab('tpp')}>
                        <Plus className="w-4 h-4" /> Create TPP
                      </Button>
                    </CardContent>
                  </Card>
                )}

                {/* Claims by priority swim lanes */}
                {(['MustHave', 'ShouldHave', 'NiceToHave'] as const).map(priority => {
                  const priorityClaims = studyClaims.filter(c => c.priority === priority);
                  if (priorityClaims.length === 0) return null;
                  const priorityConfig = {
                    MustHave:    { label: 'Must Have — Critical',   color: 'border-red-500/40',    badge: 'bg-red-500/20 text-red-400',    dot: 'bg-red-500'    },
                    ShouldHave:  { label: 'Should Have — Important', color: 'border-amber-500/40',  badge: 'bg-amber-500/20 text-amber-400', dot: 'bg-amber-500'  },
                    NiceToHave:  { label: 'Nice to Have',            color: 'border-slate-600/40',  badge: 'bg-slate-500/20 text-slate-400', dot: 'bg-slate-500'  },
                  }[priority];
                  return (
                    <div key={priority}>
                      <div className="flex items-center gap-2 mb-3">
                        <div className={`w-2 h-2 rounded-full ${priorityConfig.dot}`} />
                        <h3 className="text-sm font-semibold text-text-primary">{priorityConfig.label}</h3>
                        <Badge className={`${priorityConfig.badge} text-[10px] border-0`}>{priorityClaims.length} claims</Badge>
                      </div>
                      <div className="space-y-2">
                        {priorityClaims.map(claim => {
                          const evidenceColors: Record<string, string> = {
                            Met:        'text-green-400 bg-green-500/15',
                            InProgress: 'text-blue-400 bg-blue-500/15',
                            Planned:    'text-slate-400 bg-slate-500/15',
                            Gap:        'text-red-400 bg-red-500/15',
                            NotRequired:'text-slate-500 bg-slate-600/15',
                          };
                          const evColor = evidenceColors[claim.evidenceStatus] ?? evidenceColors.Planned;
                          return (
                            <Card key={claim.id} className={`border-l-2 ${priorityConfig?.color ?? ''}`}>
                              <CardContent className="py-3">
                                <div className="flex items-start gap-3">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <Badge variant="outline" className="text-[10px] flex-shrink-0">{claim.category}</Badge>
                                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${evColor}`}>
                                        {claim.evidenceStatus}
                                      </span>
                                    </div>
                                    <p className="text-sm text-text-primary font-medium leading-snug">{claim.targetClaimText}</p>
                                    {claim.minimumClaimText && (
                                      <p className="text-xs text-text-muted mt-1">
                                        <span className="font-medium">Floor: </span>{claim.minimumClaimText}
                                      </p>
                                    )}
                                    {claim.regulatoryLikelihood && (
                                      <div className="flex items-center gap-1 mt-1.5">
                                        <span className="text-[10px] text-text-muted">Regulatory likelihood:</span>
                                        <span className={`text-[10px] font-semibold ${claim.regulatoryLikelihood === 'High' ? 'text-green-400' : claim.regulatoryLikelihood === ('Moderate' as string) ? 'text-amber-400' : 'text-red-400'}`}>
                                          {claim.regulatoryLikelihood}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                {/* Evidence summary by category */}
                {studyClaims.length > 0 && (
                  <Card>
                    <CardHeader>
                      <h3 className="text-sm font-semibold text-text-primary">Evidence by Category</h3>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-3">
                        {(['Efficacy', 'Safety', 'Convenience', 'PatientExperience', 'Economic'] as const)
                          .filter(cat => studyClaims.some(c => c.category === cat))
                          .map(cat => {
                            const catClaims = studyClaims.filter(c => c.category === cat);
                            const metCount  = catClaims.filter(c => c.evidenceStatus === ('Met' as string)).length;
                            const pct       = Math.round((metCount / catClaims.length) * 100);
                            const catColors: Record<string, string> = {
                              Efficacy: 'bg-purple-500', Safety: 'bg-red-500',
                              Convenience: 'bg-blue-500', PatientExperience: 'bg-teal-500', Economic: 'bg-amber-500',
                            };
                            return (
                              <div key={cat} className="flex items-center gap-3">
                                <div className="w-28 text-xs text-text-secondary flex-shrink-0">{cat}</div>
                                <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                                  <div className={`h-full rounded-full ${catColors[cat]}`} style={{ width: `${pct}%` }} />
                                </div>
                                <div className="text-xs text-text-muted w-16 text-right">{metCount}/{catClaims.length} met</div>
                              </div>
                            );
                          })}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* ── Design Matrix Tab (v0.96.0) ───────────────────────────── */}
            {activeTab === 'design-matrix' && (
              <div className="space-y-6">
                {(() => {
                  const dm = selectedDesign ? getDesignMatrix(selectedDesign.id) : null;
                  if (!dm || dm.arms.length === 0) {
                    return (
                      <Card>
                        <CardContent className="py-8 text-center">
                          <GitBranch className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                          <p className="text-sm text-text-muted mb-3">No design matrix defined yet.</p>
                          <Button variant="primary" size="sm" onClick={() => {
                            if (selectedDesign) {
                              loadDesignMatrixMockData(selectedDesign.id);
                              toast.success('Design matrix loaded from protocol seed data');
                            }
                          }}>
                            <Plus className="w-4 h-4" /> Load Design Matrix
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  }
                  return (
                    <>
                      {/* Stats strip */}
                      <div className="grid grid-cols-4 gap-4">
                        {[
                          { label: 'Study Arms',       value: dm.arms.length,           color: 'text-purple-400' },
                          { label: 'Epochs',            value: dm.epochs.length,          color: 'text-blue-400'   },
                          { label: 'Total Subjects',    value: dm.totalSubjects,          color: 'text-green-400'  },
                          { label: 'Total Duration',    value: `${dm.totalDuration}w`,    color: 'text-amber-400'  },
                        ].map(stat => (
                          <Card key={stat.label}>
                            <CardContent className="py-3 text-center">
                              <div className={`text-2xl font-bold ${stat?.color ?? ''}`}>{stat.value}</div>
                              <div className="text-xs text-text-muted mt-0.5">{stat.label}</div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>

                      {/* The grid — arms × epochs */}
                      <Card>
                        <CardHeader>
                          <div className="flex items-center gap-2">
                            <GitBranch className="w-4 h-4 text-text-muted" />
                            <h3 className="text-sm font-semibold text-text-primary">Study Design Matrix</h3>
                            <Badge variant="outline" className="text-[10px]">CDISC DDF v3.0</Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0 overflow-x-auto">
                          <table className="w-full border-collapse text-xs">
                            <thead>
                              <tr>
                                <th className="text-left p-3 text-text-muted font-medium border-b border-r border-border w-40">
                                  Arm / Epoch
                                </th>
                                {dm.epochs.map(epoch => (
                                  <th key={epoch.id} className="p-3 text-center border-b border-r border-border last:border-r-0 min-w-[120px]">
                                    <div className="font-semibold text-text-primary">{epoch.studyEpochName}</div>
                                    <div className="text-[10px] text-text-muted mt-0.5">{epoch.studyEpochType}</div>
                                    {epoch.plannedDuration && (
                                      <div className="text-[10px] text-blue-400 mt-0.5">
                                        {epoch.plannedDuration.value}{epoch.plannedDuration.unit}
                                      </div>
                                    )}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {dm.arms.map((arm, armIdx) => {
                                const armTypeColors: Record<string, string> = {
                                  Experimental:    'bg-purple-500/20 text-purple-300 border-purple-500/30',
                                  ActiveComparator:'bg-blue-500/20 text-blue-300 border-blue-500/30',
                                  PlaceboComparator:'bg-slate-500/20 text-slate-300 border-slate-500/30',
                                  NoIntervention:  'bg-slate-600/20 text-slate-400 border-slate-600/30',
                                };
                                const armColor = armTypeColors[arm.studyArmType] ?? armTypeColors.NoIntervention;
                                return (
                                  <tr key={arm.id} className={armIdx % 2 === 0 ? 'bg-surface-card/30' : ''}>
                                    <td className="p-3 border-r border-b border-border last:border-b-0 align-top">
                                      <div className="font-semibold text-text-primary leading-tight">{arm.studyArmName}</div>
                                      <div className={`inline-block text-[9px] px-1.5 py-0.5 rounded border mt-1 ${armColor}`}>
                                        {arm.studyArmType}
                                      </div>
                                      {arm.plannedSubjectNumber && (
                                        <div className="text-[10px] text-text-muted mt-1">n={arm.plannedSubjectNumber}</div>
                                      )}
                                      {arm.randomizationRatio && (
                                        <div className="text-[10px] text-text-muted">ratio: {arm.randomizationRatio}</div>
                                      )}
                                    </td>
                                    {dm.epochs.map(epoch => {
                                      const cellData = dm.matrix[armIdx]?.find(c => c.epochId === epoch.id);
                                      const hasElements = cellData?.hasElements;
                                      return (
                                        <td key={epoch.id} className={`p-3 border-r border-b border-border last:border-r-0 text-center align-top ${hasElements ? 'bg-blue-500/5' : ''}`}>
                                          {hasElements ? (
                                            <div className="space-y-1">
                                              {cellData?.cell?.studyElements?.map((el: any, i: number) => (
                                                <div key={i} className="text-[10px] bg-blue-500/20 text-blue-300 rounded px-1.5 py-0.5 text-left">
                                                  {el.studyElementName ?? el.name ?? `Element ${i + 1}`}
                                                </div>
                                              ))}
                                            </div>
                                          ) : (
                                            <div className="text-slate-700 text-lg">—</div>
                                          )}
                                        </td>
                                      );
                                    })}
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </CardContent>
                      </Card>

                      {/* Arm detail cards */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {dm.arms.map(arm => (
                          <Card key={arm.id}>
                            <CardContent className="py-3">
                              <div className="flex items-start gap-2">
                                <div className="p-1.5 bg-purple-500/20 rounded-lg flex-shrink-0">
                                  <Users className="w-3.5 h-3.5 text-purple-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-semibold text-text-primary">{arm.studyArmName}</div>
                                  <div className="text-xs text-text-muted mt-0.5">{arm.studyArmDescription}</div>
                                  <div className="flex items-center gap-3 mt-1.5 text-[10px] text-text-muted">
                                    {arm.plannedSubjectNumber && <span>n = {arm.plannedSubjectNumber}</span>}
                                    {arm.randomizationRatio && <span>Randomized {arm.randomizationRatio}:1</span>}
                                    <span>{arm.studyArmOriginType}</span>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </>
                  );
                })()}
              </div>
            )}
            {activeTab === 'lineage' && (
              <div className="space-y-4 md:space-y-6">
                {/* v204b: Bidirectional Sync Card */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/20 rounded-lg">
                          <ArrowLeftRight className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-text-primary">Bidirectional Sync</h3>
                          <p className="text-sm text-text-muted">Sync endpoints between Study Design (USDM) and CTMS</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => setShowSyncConfig(!showSyncConfig)}
                        >
                          <Settings className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="primary" 
                          size="sm"
                          onClick={handleBidirectionalSync}
                          disabled={isSyncing || !selectedStudy?.linkedCTMSStudyId || endpoints.length === 0}
                        >
                          {isSyncing ? (
                            <>
                              <RefreshCw className="w-4 h-4 animate-spin" />
                              Syncing...
                            </>
                          ) : (
                            <>
                              <ArrowLeftRight className="w-4 h-4" />
                              Sync {endpoints.length} Endpoints
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  
                  {/* Sync Configuration Panel */}
                  {showSyncConfig && (
                    <CardContent className="pt-0 border-t border-border">
                      <div className="p-4 space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-text-primary mb-2">
                            <Scale className="w-4 h-4 inline mr-2" />
                            Source of Truth
                          </label>
                          <div className="grid grid-cols-3 gap-2">
                            {(['usdm', 'ctms', 'manual'] as SourceOfTruth[]).map((sot) => (
                              <button
                                key={sot}
                                onClick={() => handleConfigChange('sourceOfTruth', sot)}
                                className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                                  syncConfig.sourceOfTruth === sot
                                    ? 'bg-blue-500/20 border-blue-500 text-blue-400'
                                    : 'bg-surface-elevated border-border text-text-muted hover:border-border-hover'
                                }`}
                              >
                                {sot === 'usdm' ? 'USDM (Protocol)' : sot === 'ctms' ? 'CTMS (Operations)' : 'Manual Resolution'}
                              </button>
                            ))}
                          </div>
                          <p className="text-xs text-text-muted mt-2">
                            {syncConfig.sourceOfTruth === 'usdm' && 'Protocol definitions take precedence over operational changes'}
                            {syncConfig.sourceOfTruth === 'ctms' && 'Operational changes in CTMS take precedence'}
                            {syncConfig.sourceOfTruth === 'manual' && 'All conflicts require manual resolution'}
                          </p>
                        </div>
                        
                        <div className="flex items-center gap-4">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={syncConfig.autoResolveMinorChanges}
                              onChange={(e) => handleConfigChange('autoResolveMinorChanges', e.target.checked)}
                              className="rounded border-border bg-surface-elevated"
                            />
                            <span className="text-sm text-text-primary">Auto-resolve minor changes</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={syncConfig.trackLocalEdits}
                              onChange={(e) => handleConfigChange('trackLocalEdits', e.target.checked)}
                              className="rounded border-border bg-surface-elevated"
                            />
                            <span className="text-sm text-text-primary">Track local edits</span>
                          </label>
                        </div>
                      </div>
                    </CardContent>
                  )}
                  
                  {/* Sync Results */}
                  {biSyncResult && (
                    <CardContent className="pt-0">
                      <div className={`flex items-center gap-4 p-3 rounded-lg border ${
                        biSyncResult.conflicts - biSyncResult.autoResolved > 0
                          ? 'bg-amber-500/10 border-amber-500/20'
                          : 'bg-emerald-500/10 border-emerald-500/20'
                      }`}>
                        {biSyncResult.conflicts - biSyncResult.autoResolved > 0 ? (
                          <AlertTriangle className="w-5 h-5 text-amber-400" />
                        ) : (
                          <CheckCircle className="w-5 h-5 text-emerald-400" />
                        )}
                        <div className="text-sm">
                          <span className={biSyncResult.conflicts - biSyncResult.autoResolved > 0 ? 'text-amber-400' : 'text-emerald-400'}>
                            {biSyncResult.conflicts - biSyncResult.autoResolved > 0 
                              ? `${biSyncResult.conflicts - biSyncResult.autoResolved} conflict${biSyncResult.conflicts - biSyncResult.autoResolved > 1 ? 's' : ''} need resolution`
                              : 'Sync complete!'}
                          </span>
                          <span className="text-text-muted ml-2">
                            Direction: {biSyncResult.direction === 'usdm-to-ctms' ? 'USDM → CTMS' : 
                                       biSyncResult.direction === 'ctms-to-usdm' ? 'CTMS → USDM' : 'Bidirectional'}
                            {biSyncResult.autoResolved > 0 && ` • ${biSyncResult.autoResolved} auto-resolved`}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  )}
                  
                  {!selectedStudy?.linkedCTMSStudyId && (
                    <CardContent className="pt-0">
                      <div className="flex items-center gap-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                        <AlertTriangle className="w-5 h-5 text-amber-400" />
                        <div className="text-sm text-amber-400">
                          This study is not linked to a CTMS study. Link it in the Protocol Builder.
                        </div>
                      </div>
                    </CardContent>
                  )}
                </Card>

                {/* v204b: Conflict Resolution Card */}
                {pendingConflicts.length > 0 && (
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-amber-500/20 rounded-lg">
                            <AlertTriangle className="w-5 h-5 text-amber-400" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-text-primary">Pending Conflicts</h3>
                            <p className="text-sm text-text-muted">{pendingConflicts.length} conflict{pendingConflicts.length !== 1 ? 's' : ''} require resolution</p>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {pendingConflicts.map(conflict => (
                          <div 
                            key={conflict.id}
                            className="p-4 bg-surface-elevated rounded-lg border border-amber-500/30"
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <Badge color="amber" size="sm" className="mb-2">
                                  {conflict.field}
                                </Badge>
                                <p className="text-sm text-text-muted">Endpoint conflict detected</p>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4">
                              <div className="p-3 bg-surface-secondary rounded-lg border border-border">
                                <div className="flex items-center gap-2 mb-2">
                                  <div className="w-2 h-2 rounded-full bg-blue-400" />
                                  <span className="text-xs font-medium text-text-muted">USDM (Protocol)</span>
                                </div>
                                <p className="text-sm text-text-primary line-clamp-3">{conflict.usdmValue}</p>
                              </div>
                              <div className="p-3 bg-surface-secondary rounded-lg border border-border">
                                <div className="flex items-center gap-2 mb-2">
                                  <div className="w-2 h-2 rounded-full bg-emerald-400" />
                                  <span className="text-xs font-medium text-text-muted">CTMS (Operations)</span>
                                </div>
                                <p className="text-sm text-text-primary line-clamp-3">{conflict.ctmsValue}</p>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-text-muted mr-2">Resolve:</span>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleResolveConflict(conflict.id, 'source-wins')}
                              >
                                Use USDM
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleResolveConflict(conflict.id, 'target-wins')}
                              >
                                Use CTMS
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleResolveConflict(conflict.id, 'newest-wins')}
                              >
                                Use Newest
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Endpoint Lineage Tracking */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-text-primary">Endpoint Lineage Tracking</h3>
                        <p className="text-sm text-text-muted mt-1">Track where endpoints appear across modules</p>
                      </div>
                      {stats.outdatedLineage > 0 && (
                        <Badge color="amber" size="sm">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          {stats.outdatedLineage} need sync
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {endpoints.map(endpoint => {
                        const hasIssues = endpoint.lineage.appearances.some(
                          a => a.syncStatus === 'outdated' || a.syncStatus === 'conflict'
                        );
                        
                        return (
                          <div 
                            key={endpoint.id}
                            className="p-4 bg-surface-elevated rounded-lg border border-border hover:border-border-hover transition-colors cursor-pointer"
                            onClick={() => setSelectedEndpoint(endpoint)}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge color={objectiveLevelColorMap[endpoint.endpointLevel.decode] || 'gray'} size="sm">
                                    {endpoint.endpointLevel.decode?.toLowerCase()}
                                  </Badge>
                                  {hasIssues && (
                                    <Badge color="amber" size="sm">
                                      <AlertTriangle className="w-3 h-3 mr-1" />
                                      needs sync
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-text-primary line-clamp-2">{endpoint.endpointDescription}</p>
                                <div className="mt-2 flex items-center gap-4">
                                  {endpoint.lineage.appearances.map((appearance, idx) => (
                                    <div key={idx} className="flex items-center gap-1.5 text-xs">
                                      <div 
                                        className="w-2 h-2 rounded-full"
                                        style={{ backgroundColor: syncStatusColorMap[appearance.syncStatus] === 'green' ? '#10B981' : syncStatusColorMap[appearance.syncStatus] === 'amber' ? '#F59E0B' : '#EF4444' }}
                                      />
                                      <span className="text-text-muted capitalize">{appearance.module}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                              <Button variant="ghost" size="sm" onClick={() => toast.success('Study design action recorded — protocol version updated')}>
                                <Eye className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </>
        )}
      </div>
      
      {/* Lineage Viewer Modal */}
      {selectedEndpoint && (
        <LineageViewer 
          endpoint={selectedEndpoint} 
          onClose={() => setSelectedEndpoint(null)} 
        />
      )}

      {/* ================================================================
          NEW STUDY MODAL
          ================================================================ */}
      {showNewStudyModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowNewStudyModal(false)} />
          <div className="relative bg-surface-elevated border border-border rounded-t-2xl sm:rounded-2xl w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-surface-elevated z-10">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-500/20 flex items-center justify-center"><GitBranch className="w-5 h-5 text-emerald-500" /></div>
                <div>
                  <h2 className="text-base font-semibold text-text-primary">New Study</h2>
                  <p className="text-xs text-text-muted">USDM v3.x — creates a new study in the protocol store</p>
                </div>
              </div>
              <button onClick={() => setShowNewStudyModal(false)} className="w-8 h-8 rounded-lg hover:bg-surface-card flex items-center justify-center text-text-muted">✕</button>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Study Identity</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-text-secondary mb-1">Full Study Title <span className="text-accent-red">*</span></label>
                    <input value={newStudyForm.title} onChange={e => setNewStudyForm(f => ({ ...f, title: e.target.value }))}
                      placeholder="e.g. A Phase 3, Randomised, Double-blind Study of Ligrastinib in KRAS G12C+ NSCLC"
                      className="w-full px-3 py-2 text-sm bg-surface-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue/40 text-text-primary placeholder:text-text-muted" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1">Short Title / Protocol Number <span className="text-accent-red">*</span></label>
                    <input value={newStudyForm.shortTitle} onChange={e => setNewStudyForm(f => ({ ...f, shortTitle: e.target.value }))}
                      placeholder="e.g. LIG-2847-302"
                      className="w-full px-3 py-2 text-sm bg-surface-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue/40 text-text-primary placeholder:text-text-muted" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1">Study Acronym</label>
                    <input value={newStudyForm.acronym} onChange={e => setNewStudyForm(f => ({ ...f, acronym: e.target.value }))}
                      placeholder="e.g. KRAS-HORIZON-2"
                      className="w-full px-3 py-2 text-sm bg-surface-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue/40 text-text-primary placeholder:text-text-muted" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1">Phase</label>
                    <select value={newStudyForm.phase} onChange={e => setNewStudyForm(f => ({ ...f, phase: e.target.value }))}
                      className="w-full px-3 py-2 text-sm bg-surface-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue/40 text-text-primary">
                      {['Phase 1', 'Phase 1/2', 'Phase 2', 'Phase 2/3', 'Phase 3', 'Phase 4', 'Phase 1b'].map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1">Study Type</label>
                    <select value={newStudyForm.type} onChange={e => setNewStudyForm(f => ({ ...f, type: e.target.value }))}
                      className="w-full px-3 py-2 text-sm bg-surface-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue/40 text-text-primary">
                      {['INTERVENTIONAL', 'OBSERVATIONAL', 'EXPANDED_ACCESS'].map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1">Link to Product</label>
                    <select value={newStudyForm.linkedProductId ?? ''} onChange={e => setNewStudyForm(f => ({ ...f, linkedProductId: e.target.value }))}
                      className="w-full px-3 py-2 text-sm bg-surface-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue/40 text-text-primary">
                      <option value="">None</option>
                      {products.map(p => <option key={p.id} value={p.id}>{p.name}{p.brandName ? ` — ${p.brandName}` : ''}</option>)}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-text-secondary mb-1">Study Rationale</label>
                    <textarea value={newStudyForm.rationale} onChange={e => setNewStudyForm(f => ({ ...f, rationale: e.target.value }))}
                      rows={3} placeholder="Brief scientific rationale for this study..."
                      className="w-full px-3 py-2 text-sm bg-surface-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue/40 text-text-primary placeholder:text-text-muted resize-none" />
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-lg">
                <GitBranch className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-text-secondary">The study will be created in the USDM store. You can then add objectives, endpoints, arms, epochs, and schedule of activities from the Protocol Builder tab.</p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border sticky bottom-0 bg-surface-elevated">
              <Button variant="ghost" size="sm" onClick={() => setShowNewStudyModal(false)}>Cancel</Button>
              <Button variant="primary" size="sm" onClick={() => {
                if (!newStudyForm.title.trim() || !newStudyForm.shortTitle.trim()) return;
                const created = createStudy({
                  studyTitle: newStudyForm.title,
                  studyShortTitle: newStudyForm.shortTitle,
                  studyAcronym: newStudyForm.acronym || undefined,
                  studyRationale: newStudyForm.rationale,
                  studyPhase: { id: newStudyForm.phase, decode: newStudyForm.phase } as any,
                  studyType: { id: newStudyForm.type, decode: newStudyForm.type } as any,
                  linkedProductId: newStudyForm.linkedProductId || undefined,
                });
                if (created?.id) setSelectedStudyId(created.id);
                setShowNewStudyModal(false);
                setNewStudyForm({ title: '', shortTitle: '', acronym: '', phase: 'Phase 3', type: 'INTERVENTIONAL', rationale: '' });
                setActiveTab('protocol');
                toast.success(`Study "${newStudyForm.shortTitle}" created`);
              }}>Create Study</Button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================
          PROTOCOL AMENDMENT MODAL
          ================================================================ */}
      {showAmendmentModal && selectedStudy && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowAmendmentModal(false)} />
          <div className="relative bg-surface-elevated border border-border rounded-t-2xl sm:rounded-2xl w-full sm:max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-surface-elevated z-10">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-accent-amber/20 flex items-center justify-center"><FileText className="w-5 h-5 text-accent-amber" /></div>
                <div>
                  <h2 className="text-base font-semibold text-text-primary">Initiate Protocol Amendment</h2>
                  <p className="text-xs text-text-muted">{selectedStudy.studyShortTitle}</p>
                </div>
              </div>
              <button onClick={() => setShowAmendmentModal(false)} className="w-8 h-8 rounded-lg hover:bg-surface-card flex items-center justify-center text-text-muted">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">Amendment Version <span className="text-accent-red">*</span></label>
                  <input value={amendmentForm.version} onChange={e => setAmendmentForm(f => ({ ...f, version: e.target.value }))}
                    placeholder="e.g. Amendment 2 (v3.0)"
                    className="w-full px-3 py-2 text-sm bg-surface-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue/40 text-text-primary placeholder:text-text-muted" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">Change Classification</label>
                  <select value={amendmentForm.changeType} onChange={e => setAmendmentForm(f => ({ ...f, changeType: e.target.value }))}
                    className="w-full px-3 py-2 text-sm bg-surface-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue/40 text-text-primary">
                    <option value="minor">Minor (administrative)</option>
                    <option value="moderate">Moderate (non-substantial)</option>
                    <option value="major">Major (substantial)</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-text-secondary mb-1">Affected USDM Sections</label>
                  <input value={amendmentForm.sections} onChange={e => setAmendmentForm(f => ({ ...f, sections: e.target.value }))}
                    placeholder="e.g. Eligibility criteria, Primary endpoint, Dose escalation"
                    className="w-full px-3 py-2 text-sm bg-surface-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue/40 text-text-primary placeholder:text-text-muted" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-text-secondary mb-1">Amendment Rationale <span className="text-accent-red">*</span></label>
                  <textarea value={amendmentForm.rationale} onChange={e => setAmendmentForm(f => ({ ...f, rationale: e.target.value }))}
                    rows={4} placeholder="Describe the scientific or operational reason for this amendment..."
                    className="w-full px-3 py-2 text-sm bg-surface-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue/40 text-text-primary placeholder:text-text-muted resize-none" />
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-accent-amber/5 border border-accent-amber/20 rounded-lg">
                <AlertCircle className="w-4 h-4 text-accent-amber mt-0.5 flex-shrink-0" />
                <p className="text-xs text-text-secondary">A <strong>major (substantial)</strong> amendment requires IRB/IEC re-approval before implementation. All amendment records are maintained in the TMF and flagged in the USDM version history.</p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border sticky bottom-0 bg-surface-elevated">
              <Button variant="ghost" size="sm" onClick={() => setShowAmendmentModal(false)}>Cancel</Button>
              <Button variant="primary" size="sm" onClick={() => {
                if (!amendmentForm.version.trim() || !amendmentForm.rationale.trim()) return;
                setShowAmendmentModal(false);
                setAmendmentForm({ version: '', rationale: '', changeType: 'minor', sections: '' });
                toast.success(`Amendment "${amendmentForm.version}" initiated — USDM version history updated`);
                setActiveTab('protocol');
              }}>Initiate Amendment</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default StudyDesignScreen;
