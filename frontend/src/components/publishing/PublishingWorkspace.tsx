// =============================================================================
// PUBLISHING WORKSPACE - v0.39.2
// =============================================================================
// Comprehensive publishing interface with resizable panels integrating:
// - Template Library
// - AI Assembly Assistant
// - Multi-Region Builder
// - Content Reuse Engine
// - Enhanced Validation
// =============================================================================


import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  FileText,
  Sparkles,
  Globe,
  CheckCircle,
  Send,
  Package,
  Plus,
  Search,
  Clock,
  RefreshCw,
  Eye,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  FileCheck,
  Zap,
  History,
  GripVertical,
  GripHorizontal,
  X,
  ChevronDown,
  ChevronUp,
  Shield,
  CheckSquare,
  RotateCcw,
} from 'lucide-react';

// Import publishing components
import { TemplateLibraryPanel } from './TemplateLibraryPanel';
import { AIAssemblyAssistant } from './AIAssemblyAssistant';
import { MultiRegionBuilder } from './MultiRegionBuilder';
import { ContentReuseEngine } from './ContentReuseEngine';
import { EnhancedValidationPanel } from './EnhancedValidationPanel';
import { SubmissionPackageBuilder } from './SubmissionPackageBuilder';
import { TransmissionHistoryPanel } from './TransmissionHistoryPanel';
import { GatewayAuditTrailPanel } from './GatewayAuditTrailPanel';
import { useDataPackageStore } from '@/store/useDataPackageStore';
import { PriorDossierImportPanel } from './PriorDossierImportPanel';

// =============================================================================
// TYPES
// =============================================================================

type WorkspaceView = 
  | 'templates'
  | 'ai-assistant'
  | 'multi-region'
  | 'reuse'
  | 'validation'
  | 'package'
  | 'transmission'
  | 'history'
  | 'prior-dossier';

interface WorkspacePanel {
  id: WorkspaceView;
  title: string;
  icon: React.ElementType;
  description: string;
  badge?: string;
  badgeColor?: string;
}

interface Submission {
  id: string;
  applicationNumber: string;
  productName: string;
  sequenceNumber: string;
  type: string;
  status: 'draft' | 'in-progress' | 'validated' | 'submitted';
  region: string;
  lastModified: string;
}

// =============================================================================
// RESIZE HOOK
// =============================================================================

interface UseResizeOptions {
  initialSize: number;
  minSize: number;
  maxSize: number;
  direction: 'horizontal' | 'vertical';
  storageKey?: string;
}

function useResize({
  initialSize,
  minSize,
  maxSize,
  direction,
  storageKey,
}: UseResizeOptions) {
  const [size, setSize] = useState(() => {
    if (storageKey && typeof window !== 'undefined') {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = parseInt(stored, 10);
        if (!isNaN(parsed)) {
          return Math.min(maxSize, Math.max(minSize, parsed));
        }
      }
    }
    return initialSize;
  });

  const [isResizing, setIsResizing] = useState(false);
  const startPosRef = useRef(0);
  const startSizeRef = useRef(0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    startPosRef.current = direction === 'horizontal' ? e.clientX : e.clientY;
    startSizeRef.current = size;
  }, [size, direction]);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const currentPos = direction === 'horizontal' ? e.clientX : e.clientY;
      const delta = currentPos - startPosRef.current;
      const newSize = Math.min(maxSize, Math.max(minSize, startSizeRef.current + delta));
      setSize(newSize);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      if (storageKey) {
        localStorage.setItem(storageKey, size.toString());
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.userSelect = 'none';
    document.body.style.cursor = direction === 'horizontal' ? 'col-resize' : 'row-resize';

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [isResizing, minSize, maxSize, direction, storageKey, size]);

  return { size, setSize, isResizing, handleMouseDown };
}

// =============================================================================
// RESIZE HANDLE COMPONENT
// =============================================================================

interface ResizeHandleProps {
  direction: 'horizontal' | 'vertical';
  onMouseDown: (e: React.MouseEvent) => void;
  isResizing: boolean;
}

function ResizeHandle({ direction, onMouseDown, isResizing }: ResizeHandleProps) {
  const isHorizontal = direction === 'horizontal';
  const GripIcon = isHorizontal ? GripVertical : GripHorizontal;

  return (
    <div
      onMouseDown={onMouseDown}
      className={`
        relative group flex-shrink-0 flex items-center justify-center
        ${isHorizontal ? 'w-2 cursor-col-resize' : 'h-2 cursor-row-resize'}
        ${isResizing ? 'bg-accent-blue/20' : 'hover:bg-accent-blue/10'}
        transition-colors
      `}
      role="separator"
      aria-orientation={isHorizontal ? 'vertical' : 'horizontal'}
      aria-label="Resize handle"
    >
      <div
        className={`
          absolute transition-all duration-150
          ${isHorizontal
            ? 'inset-y-0 w-0.5 left-1/2 -translate-x-1/2'
            : 'inset-x-0 h-0.5 top-1/2 -translate-y-1/2'
          }
          ${isResizing ? 'bg-accent-blue' : 'bg-border group-hover:bg-accent-blue/50'}
        `}
      />
      <GripIcon
        className={`
          w-3 h-3 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity
          ${isResizing ? 'opacity-100 text-accent-blue' : ''}
        `}
      />
      <div
        className={`
          absolute
          ${isHorizontal ? 'inset-y-0 w-4 -left-1' : 'inset-x-0 h-4 -top-1'}
        `}
      />
    </div>
  );
}

// =============================================================================
// CONFIGURATION
// =============================================================================

const WORKSPACE_PANELS: WorkspacePanel[] = [
  {
    id: 'templates',
    title: 'Templates',
    icon: FileText,
    description: 'Pre-built submission templates',
    badge: '8',
  },
  {
    id: 'ai-assistant',
    title: 'AI Assembly',
    icon: Sparkles,
    description: 'AI-powered document assembly',
    badge: 'AI',
    badgeColor: 'bg-purple-500/20 text-purple-400',
  },
  {
    id: 'reuse',
    title: 'Content Reuse',
    icon: RefreshCw,
    description: 'Reuse documents across submissions',
    badge: '67%',
    badgeColor: 'bg-green-500/20 text-green-400',
  },
  {
    id: 'multi-region',
    title: 'Multi-Region',
    icon: Globe,
    description: 'Parallel regional submissions',
  },
  {
    id: 'validation',
    title: 'Validation',
    icon: FileCheck,
    description: 'eCTD compliance validation',
  },
  {
    id: 'package',
    title: 'Package',
    icon: Package,
    description: 'Build submission package',
  },
  {
    id: 'transmission',
    title: 'Transmit',
    icon: Send,
    description: 'Gateway submission',
  },
  {
    id: 'history',
    title: 'History',
    icon: History,
    description: 'Submission history',
  },
  {
    id: 'prior-dossier',
    title: 'Prior Dossier',
    icon: RotateCcw,
    description: 'Rolling submission carry-forward',
    badge: 'NEW',
    badgeColor: 'bg-purple-500/20 text-purple-400',
  },
];

const MOCK_SUBMISSIONS: Submission[] = [
  {
    id: 'sub-1',
    applicationNumber: 'NDA-123456',
    productName: 'Ligrastinib 50mg',
    sequenceNumber: '0003',
    type: 'IR Response',
    status: 'in-progress',
    region: 'US',
    lastModified: '2025-01-29',
  },
  {
    id: 'sub-2',
    applicationNumber: 'NDA-123456',
    productName: 'Ligrastinib 50mg',
    sequenceNumber: '0002',
    type: 'Amendment',
    status: 'submitted',
    region: 'US',
    lastModified: '2025-01-15',
  },
  {
    id: 'sub-3',
    applicationNumber: 'MAA-EU-2024-001',
    productName: 'Ligrastinib 50mg',
    sequenceNumber: '0000',
    type: 'Original',
    status: 'validated',
    region: 'EU',
    lastModified: '2025-01-28',
  },
];

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

function PanelNavigation({
  panels,
  activeView,
  onSelectView,
  collapsed,
}: {
  panels: WorkspacePanel[];
  activeView: WorkspaceView;
  onSelectView: (view: WorkspaceView) => void;
  collapsed?: boolean;
}) {
  return (
    <div className="p-2 space-y-1">
      {panels.map((panel) => {
        const Icon = panel.icon;
        const isActive = activeView === panel.id;
        
        return (
          <button
            key={panel.id}
            onClick={() => onSelectView(panel.id)}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
              isActive
                ? 'bg-accent-blue/20 text-accent-blue'
                : 'text-text-secondary hover:bg-surface-elevated hover:text-text-primary'
            }`}
            title={collapsed ? panel.title : panel.description}
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            {!collapsed && (
              <>
                <span className="flex-1 text-sm font-medium">{panel.title}</span>
                {panel.badge && (
                  <span className={`px-1.5 py-0.5 text-xs rounded ${panel.badgeColor || 'bg-surface-elevated text-text-muted'}`}>
                    {panel.badge}
                  </span>
                )}
              </>
            )}
          </button>
        );
      })}
    </div>
  );
}

function SubmissionSelector({
  submissions,
  selectedId,
  onSelect,
}: {
  submissions: Submission[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  
  const filtered = submissions.filter(s => 
    s.applicationNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.productName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const statusConfig = {
    draft: { color: 'text-slate-400 bg-slate-500/20', icon: Clock },
    'in-progress': { color: 'text-blue-400 bg-blue-500/20', icon: RefreshCw },
    validated: { color: 'text-green-400 bg-green-500/20', icon: CheckCircle },
    submitted: { color: 'text-purple-400 bg-purple-500/20', icon: Send },
  };

  return (
    <div className="border-b border-border">
      <div className="p-3 border-b border-border/50">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            placeholder="Search submissions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-surface-elevated border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-blue"
          />
        </div>
      </div>
      
      <div className="max-h-48 overflow-y-auto">
        {filtered.map((sub) => {
          const config = statusConfig[sub.status];
          const StatusIcon = config.icon;
          const isSelected = selectedId === sub.id;
          
          return (
            <button
              key={sub.id}
              onClick={() => onSelect(sub.id)}
              className={`w-full p-3 text-left border-b border-border/30 transition-colors ${
                isSelected ? 'bg-accent-blue/10' : 'hover:bg-surface-elevated'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-text-primary text-sm">{sub.applicationNumber}</span>
                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs ${config?.color ?? ''}`}>
                  <StatusIcon className="w-3 h-3" />
                  {sub.status}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-text-muted">
                <span>Seq {sub.sequenceNumber}</span>
                <span>•</span>
                <span>{sub.type}</span>
                <span>•</span>
                <span>{sub.region}</span>
              </div>
            </button>
          );
        })}
      </div>
      
      <div className="p-3">
        <button className="w-full px-3 py-2 text-sm text-accent-blue hover:bg-accent-blue/10 rounded-lg flex items-center justify-center gap-2">
          <Plus className="w-4 h-4" />
          New Submission
        </button>
      </div>
    </div>
  );
}

function WorkspaceContent({
  view,
  selectedSubmission,
}: {
  view: WorkspaceView;
  selectedSubmission: Submission | null;
}) {
  const manifest = useDataPackageStore(s => s.manifest);
  const markImported = useDataPackageStore(s => s.markImported);
  switch (view) {
    case 'templates':
      return (
        <TemplateLibraryPanel
          onSelectTemplate={(template) => {
            /* Template selected */
          }}
        />
      );
    
    case 'ai-assistant':
      return (
        <AIAssemblyAssistant
          haqId={selectedSubmission?.type === 'IR Response' ? 'haq-001' : undefined}
          submissionId={selectedSubmission?.id}
          onAcceptPlan={() => { /* Plan accepted */ }}
        />
      );
    
    case 'reuse':
      return (
        <ContentReuseEngine
          submissionId={selectedSubmission?.id}
          onSelectDocuments={() => { /* Docs selected */ }}
        />
      );
    
    case 'multi-region':
      return <MultiRegionBuilder />;
    
    case 'validation':
      return <EnhancedValidationPanel submissionId={selectedSubmission?.id} />;
    
    case 'package':
      return (
        <div className="h-full overflow-y-auto">
          {/* Data Package Manifest panel — shown when validated datasets arrive from Biostats */}
          {manifest && !manifest.importedToSubmission && (
            <div className="m-4 p-4 bg-emerald-500/8 border border-emerald-500/25 rounded-xl">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-500/15 rounded-lg">
                    <Shield className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-emerald-400">Validated Data Package Available</div>
                    <div className="text-xs text-text-muted mt-0.5">
                      {manifest.studyId} · {manifest.datasets.length} SDTM datasets · Score {manifest.overallScore}% · Created {new Date(manifest.createdAt).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    const seq = selectedSubmission?.sequenceNumber ?? '0001';
                    markImported(seq);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 text-white rounded-lg text-xs font-semibold hover:bg-emerald-600 transition-colors"
                >
                  Import {manifest.datasets.length} Datasets
                </button>
              </div>
              {/* Dataset slot mapping */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {manifest.datasets.map(d => (
                  <div key={d.domain} className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs ${d.status === 'PASS' ? 'bg-emerald-500/5 border-emerald-500/20' : d.status === 'FAIL' ? 'bg-red-500/5 border-red-500/20' : 'bg-amber-500/5 border-amber-500/20'}`}>
                    <span className={`font-mono font-bold ${d.status === 'PASS' ? 'text-emerald-400' : d.status === 'FAIL' ? 'text-red-400' : 'text-amber-400'}`}>{d.domain}</span>
                    <span className="text-text-muted truncate flex-1">{d.label}</span>
                    <span className="text-text-muted/60 flex-shrink-0">{d.score}%</span>
                  </div>
                ))}
              </div>
              <div className="mt-2 text-xs text-text-muted">
                Datasets will be pre-mapped to their eCTD slots · define.xml v{manifest.defineXmlVersion} · CDISC SDTM v{manifest.cdiscVersion}
              </div>
            </div>
          )}
          {manifest?.importedToSubmission && (
            <div className="mx-4 mt-4 flex items-center gap-3 p-3 bg-blue-500/8 border border-blue-500/20 rounded-xl text-xs text-blue-400">
              <CheckSquare className="w-4 h-4 flex-shrink-0" />
              {manifest.datasets.length} validated datasets imported to sequence {manifest.submissionSequence} · Ready for package assembly
            </div>
          )}
          <SubmissionPackageBuilder
            submissionInfo={{
              applicationNumber: selectedSubmission?.applicationNumber,
              applicationType: selectedSubmission?.type,
              sequenceNumber: selectedSubmission?.sequenceNumber,
            }}
            onCompileComplete={() => {}}
          />
        </div>
      );
    
    case 'transmission':
      return (
        <div className="h-full overflow-y-auto">
          <TransmissionHistoryPanel
            showQueue
            showFilters
            onTransmissionSelect={() => {}}
          />
        </div>
      );
    
    case 'history':
      return (
        <div className="h-full overflow-y-auto">
          <GatewayAuditTrailPanel
            applicationNumber={selectedSubmission?.applicationNumber}
            showExport
            showVerification
          />
        </div>
      );

    case 'prior-dossier':
      return <PriorDossierImportPanel />;
    
    default:
      return (
        <div className="h-full flex items-center justify-center text-text-muted">
          Select a panel to begin
        </div>
      );
  }
}

function DetailPanel({
  view,
  onClose,
}: {
  view: WorkspaceView;
  onClose: () => void;
}) {
  return (
    <div className="h-full flex flex-col">
      <div className="p-3 border-b border-border flex items-center justify-between bg-surface-card">
        <h3 className="font-semibold text-text-primary text-sm">
          {view === 'validation' ? 'Validation Details' :
           view === 'reuse' ? 'Document Preview' :
           view === 'package' ? 'Package Preview' : 'Details'}
        </h3>
        <button onClick={onClose} className="p-1 hover:bg-surface-elevated rounded">
          <X className="w-4 h-4 text-text-muted" />
        </button>
      </div>
      <div className="flex-1 overflow-auto p-4">
        <div className="text-center text-text-muted py-8">
          <Eye className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Select an item to preview</p>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function PublishingWorkspace() {
  const [activeView, setActiveView] = useState<WorkspaceView>('templates');
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>('sub-1');
  const [showLeftPanel, setShowLeftPanel] = useState(true);
  const [showRightPanel, setShowRightPanel] = useState(false);
  const [showBottomPanel, setShowBottomPanel] = useState(false);
  
  // Resize hooks
  const leftPanelResize = useResize({
    initialSize: 280,
    minSize: 200,
    maxSize: 400,
    direction: 'horizontal',
    storageKey: 'pub-workspace-left',
  });

  const rightPanelResize = useResize({
    initialSize: 360,
    minSize: 280,
    maxSize: 600,
    direction: 'horizontal',
    storageKey: 'pub-workspace-right',
  });

  const bottomPanelResize = useResize({
    initialSize: 250,
    minSize: 150,
    maxSize: 400,
    direction: 'vertical',
    storageKey: 'pub-workspace-bottom',
  });
  
  const selectedSubmission = MOCK_SUBMISSIONS.find(s => s.id === selectedSubmissionId) || null;

  // Calculate stats
  const stats = useMemo(() => ({
    drafts: MOCK_SUBMISSIONS.filter(s => s.status === 'draft').length,
    inProgress: MOCK_SUBMISSIONS.filter(s => s.status === 'in-progress').length,
    validated: MOCK_SUBMISSIONS.filter(s => s.status === 'validated').length,
    submitted: MOCK_SUBMISSIONS.filter(s => s.status === 'submitted').length,
  }), []);

  return (
    <div className="h-full flex flex-col bg-surface">
      {/* Header */}
      <div className="p-4 border-b border-border bg-surface-elevated">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-accent-blue/20 to-accent-purple/20 rounded-xl">
              <Package className="w-6 h-6 text-accent-blue" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-text-primary">Publishing Workspace</h1>
              <p className="text-sm text-text-muted">Build, validate, and submit regulatory packages</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Panel toggle buttons */}
            <div className="flex items-center gap-1 px-2 border-r border-border">
              <button
                onClick={() => setShowLeftPanel(!showLeftPanel)}
                className={`p-2 rounded-lg transition-colors ${
                  showLeftPanel ? 'text-accent-blue bg-accent-blue/10' : 'text-text-muted hover:bg-surface-card'
                }`}
                title={showLeftPanel ? 'Hide sidebar' : 'Show sidebar'}
              >
                {showLeftPanel ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
              </button>
              <button
                onClick={() => setShowRightPanel(!showRightPanel)}
                className={`p-2 rounded-lg transition-colors ${
                  showRightPanel ? 'text-accent-blue bg-accent-blue/10' : 'text-text-muted hover:bg-surface-card'
                }`}
                title={showRightPanel ? 'Hide detail panel' : 'Show detail panel'}
              >
                {showRightPanel ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
              </button>
              <button
                onClick={() => setShowBottomPanel(!showBottomPanel)}
                className={`p-2 rounded-lg transition-colors ${
                  showBottomPanel ? 'text-accent-blue bg-accent-blue/10' : 'text-text-muted hover:bg-surface-card'
                }`}
                title={showBottomPanel ? 'Hide bottom panel' : 'Show bottom panel'}
              >
                {showBottomPanel ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              </button>
            </div>
            
            <button className="px-4 py-2 text-sm font-medium text-white bg-accent-blue rounded-lg hover:bg-accent-blue/90 flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Quick Publish
            </button>
          </div>
        </div>
        
        {/* Stats Bar */}
        <div className="grid grid-cols-4 gap-4">
          <div className="p-3 bg-surface-card rounded-lg flex items-center gap-3">
            <Clock className="w-5 h-5 text-slate-400" />
            <div>
              <div className="text-lg font-bold text-text-primary">{stats.drafts}</div>
              <div className="text-xs text-text-muted">Drafts</div>
            </div>
          </div>
          <div className="p-3 bg-blue-500/10 rounded-lg flex items-center gap-3">
            <RefreshCw className="w-5 h-5 text-blue-400" />
            <div>
              <div className="text-lg font-bold text-blue-400">{stats.inProgress}</div>
              <div className="text-xs text-blue-400">In Progress</div>
            </div>
          </div>
          <div className="p-3 bg-green-500/10 rounded-lg flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <div>
              <div className="text-lg font-bold text-green-400">{stats.validated}</div>
              <div className="text-xs text-green-400">Validated</div>
            </div>
          </div>
          <div className="p-3 bg-purple-500/10 rounded-lg flex items-center gap-3">
            <Send className="w-5 h-5 text-purple-400" />
            <div>
              <div className="text-lg font-bold text-purple-400">{stats.submitted}</div>
              <div className="text-xs text-purple-400">Submitted</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content with Resizable Panels */}
      <div className="flex-1 overflow-hidden flex">
        {/* Left Panel */}
        {showLeftPanel && (
          <>
            <div
              className="flex-shrink-0 flex flex-col bg-surface-card border-r border-border overflow-hidden"
              style={{ width: leftPanelResize.size }}
            >
              {/* Panel Header */}
              <div className="p-3 border-b border-border flex items-center justify-between">
                <span className="font-semibold text-text-primary text-sm">Submissions</span>
                <button
                  onClick={() => setShowLeftPanel(false)}
                  className="p-1 hover:bg-surface-elevated rounded"
                >
                  <PanelLeftClose className="w-4 h-4 text-text-muted" />
                </button>
              </div>
              
              {/* Submission Selector */}
              <SubmissionSelector
                submissions={MOCK_SUBMISSIONS}
                selectedId={selectedSubmissionId}
                onSelect={setSelectedSubmissionId}
              />
              
              {/* Panel Navigation */}
              <div className="flex-1 overflow-auto">
                <div className="p-2 border-t border-border">
                  <div className="text-xs text-text-muted font-medium px-3 py-2 uppercase">Workspace</div>
                </div>
                <PanelNavigation
                  panels={WORKSPACE_PANELS}
                  activeView={activeView}
                  onSelectView={setActiveView}
                />
              </div>
            </div>
            
            {/* Left Resize Handle */}
            <ResizeHandle
              direction="horizontal"
              onMouseDown={leftPanelResize.handleMouseDown}
              isResizing={leftPanelResize.isResizing}
            />
          </>
        )}

        {/* Center Content */}
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
          {/* Main Content Area */}
          <div className="flex-1 min-h-0 overflow-hidden">
            <WorkspaceContent
              view={activeView}
              selectedSubmission={selectedSubmission}
            />
          </div>

          {/* Bottom Panel */}
          {showBottomPanel && (
            <>
              <ResizeHandle
                direction="vertical"
                onMouseDown={bottomPanelResize.handleMouseDown}
                isResizing={bottomPanelResize.isResizing}
              />
              <div
                className="flex-shrink-0 bg-surface-card border-t border-border overflow-hidden"
                style={{ height: bottomPanelResize.size }}
              >
                <div className="p-3 border-b border-border flex items-center justify-between">
                  <h3 className="font-semibold text-text-primary text-sm">Validation Log</h3>
                  <button
                    onClick={() => setShowBottomPanel(false)}
                    className="p-1 hover:bg-surface-elevated rounded"
                  >
                    <ChevronDown className="w-4 h-4 text-text-muted" />
                  </button>
                </div>
                <div className="p-4 overflow-auto h-full">
                  <div className="text-sm text-text-muted font-mono space-y-1">
                    <div>[14:32:01] Starting eCTD validation...</div>
                    <div>[14:32:02] Checking PDF compliance for 45 documents...</div>
                    <div className="text-green-400">[14:32:05] ✓ 43 documents passed PDF/A validation</div>
                    <div className="text-amber-400">[14:32:05] ⚠ 2 documents have warnings</div>
                    <div>[14:32:06] Validating backbone structure...</div>
                    <div className="text-green-400">[14:32:07] ✓ Backbone structure valid</div>
                    <div>[14:32:08] Checking cross-references...</div>
                    <div className="text-red-400">[14:32:09] ✗ 1 broken cross-reference found</div>
                    <div>[14:32:10] Validation complete. 1 error, 2 warnings.</div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Right Panel */}
        {showRightPanel && (
          <>
            <ResizeHandle
              direction="horizontal"
              onMouseDown={rightPanelResize.handleMouseDown}
              isResizing={rightPanelResize.isResizing}
            />
            <div
              className="flex-shrink-0 bg-surface-card border-l border-border overflow-hidden"
              style={{ width: rightPanelResize.size }}
            >
              <DetailPanel
                view={activeView}
                onClose={() => setShowRightPanel(false)}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default PublishingWorkspace;
