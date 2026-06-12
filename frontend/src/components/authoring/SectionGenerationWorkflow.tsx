

import { useState, useCallback, useMemo, useEffect } from 'react';
import {
  Play, PlayCircle, Pause, CheckCircle, Circle, Clock, AlertCircle,
  ChevronDown, ChevronRight, Wand2, RefreshCw, Lock, Unlock,
  ListTree, Settings2, Layers, Zap, BookOpen, FileText, Target,
  ArrowRight, SkipForward, StopCircle, CheckCircle2, XCircle,
  Info, AlertTriangle, CircleDashed, Loader2, Sparkles
} from 'lucide-react';
import { DocumentSection, DocumentType, SectionStatus, AuthoringDocument } from '@/types/authoring';
import { useAuthoringStore, SourceDocument, Citation, SectionDraft } from '@/store/useAuthoringStore';
import { getAIDocumentConfig, getSectionAIConfig, SourceType } from '@/config/ai-authoring-config';
import { generateSectionContent } from '@/services/ai-authoring-service';
import { useToast } from '@/components/ui/Toast';

// ============================================================================
// TYPES
// ============================================================================

interface SectionNode {
  section: DocumentSection;
  depth: number;
  hasChildren: boolean;
  isExpanded: boolean;
  dependencies: string[]; // Section IDs this depends on
  dependents: string[]; // Section IDs that depend on this
  canGenerate: boolean;
  generationStatus: GenerationStatus;
}

type GenerationStatus = 
  | 'not-started'
  | 'pending'     // In queue for batch generation
  | 'generating'
  | 'completed'
  | 'failed'
  | 'skipped';

interface BatchGenerationState {
  isRunning: boolean;
  isPaused: boolean;
  queue: string[]; // Section IDs
  currentIndex: number;
  completed: string[];
  failed: string[];
  skipped: string[];
}

interface SectionGenerationWorkflowProps {
  document: AuthoringDocument;
  onSectionGenerated?: (sectionId: string, content: string, citations: Citation[]) => void;
  onBatchComplete?: (results: BatchGenerationResult) => void;
}

interface BatchGenerationResult {
  totalSections: number;
  completed: number;
  failed: number;
  skipped: number;
  duration: number;
}

// ============================================================================
// DEPENDENCY GRAPH BUILDER
// ============================================================================

function buildDependencyGraph(sections: DocumentSection[]): Map<string, { deps: string[], dependents: string[] }> {
  const graph = new Map<string, { deps: string[], dependents: string[] }>();
  
  // Initialize all sections
  const flatSections = flattenSections(sections);
  flatSections.forEach(s => {
    graph.set(s.id, { deps: [], dependents: [] });
  });
  
  // Build dependencies based on section numbering
  // Rule: Section N.M depends on N.(M-1) being complete
  // Rule: Section N.M.X depends on N.M being complete
  flatSections.forEach(section => {
    const parts = section.number.split('.');
    if (parts.length > 1) {
      // Find parent or previous sibling
      const lastPart = parseInt(parts[parts.length - 1], 10);
      
      // Depend on previous sibling if exists
      if (lastPart > 1) {
        const prevNumber = [...parts.slice(0, -1), String(lastPart - 1)].join('.');
        const prevSection = flatSections.find(s => s.number === prevNumber);
        if (prevSection) {
          graph.get(section.id)!.deps.push(prevSection.id);
          graph.get(prevSection.id)!.dependents.push(section.id);
        }
      }
      
      // Depend on parent section
      if (parts.length > 2) {
        const parentNumber = parts.slice(0, -1).join('.');
        const parentSection = flatSections.find(s => s.number === parentNumber);
        if (parentSection) {
          graph.get(section.id)!.deps.push(parentSection.id);
          graph.get(parentSection.id)!.dependents.push(section.id);
        }
      }
    }
  });
  
  return graph;
}

function flattenSections(sections: DocumentSection[]): DocumentSection[] {
  const result: DocumentSection[] = [];
  
  function traverse(items: DocumentSection[]) {
    for (const section of items) {
      result.push(section);
      if (section.subsections?.length) {
        traverse(section.subsections);
      }
    }
  }
  
  traverse(sections);
  return result;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function SectionGenerationWorkflow({
  document,
  onSectionGenerated,
  onBatchComplete,
}: SectionGenerationWorkflowProps) {
  const toast = useToast();
  
  // Store state
  const availableSources = useAuthoringStore(s => s.availableSources);
  const selectedSourceIds = useAuthoringStore(s => s.selectedSourceIds);
  const sectionDrafts = useAuthoringStore(s => s.sectionDrafts);
  const isGenerating = useAuthoringStore(s => s.isGenerating);
  const generatingSection = useAuthoringStore(s => s.generatingSection);
  const startGeneration = useAuthoringStore(s => s.startGeneration);
  const completeGeneration = useAuthoringStore(s => s.completeGeneration);
  const failGeneration = useAuthoringStore(s => s.failGeneration);
  
  // Local state
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [selectedSections, setSelectedSections] = useState<Set<string>>(new Set());
  const [showSettings, setShowSettings] = useState(false);
  const [batchState, setBatchState] = useState<BatchGenerationState>({
    isRunning: false,
    isPaused: false,
    queue: [],
    currentIndex: 0,
    completed: [],
    failed: [],
    skipped: [],
  });
  const [generationMode, setGenerationMode] = useState<'sequential' | 'selected'>('sequential');
  const [skipCompleted, setSkipCompleted] = useState(true);
  const [pauseOnError, setPauseOnError] = useState(true);
  const [batchStartTime, setBatchStartTime] = useState<number>(0);
  
  // Build dependency graph
  const dependencyGraph = useMemo(() => 
    buildDependencyGraph(document.sections),
    [document.sections]
  );
  
  const flatSections = useMemo(() => 
    flattenSections(document.sections),
    [document.sections]
  );
  
  // Document config
  const docConfig = getAIDocumentConfig(document.documentType);
  
  // Calculate section nodes with generation status
  const sectionNodes = useMemo((): SectionNode[] => {
    return flatSections.map(section => {
      const graphEntry = dependencyGraph.get(section.id);
      const draft = sectionDrafts[section.id];
      
      // Check if dependencies are satisfied
      const depsComplete = graphEntry?.deps.every(depId => {
        const depDraft = sectionDrafts[depId];
        const depSection = flatSections.find(s => s.id === depId);
        return depDraft?.isAccepted || depSection?.status === 'approved';
      }) ?? true;
      
      let generationStatus: GenerationStatus = 'not-started';
      if (batchState.queue.includes(section.id)) {
        if (batchState.completed.includes(section.id)) {
          generationStatus = 'completed';
        } else if (batchState.failed.includes(section.id)) {
          generationStatus = 'failed';
        } else if (batchState.skipped.includes(section.id)) {
          generationStatus = 'skipped';
        } else if (generatingSection === section.id) {
          generationStatus = 'generating';
        } else {
          generationStatus = 'pending';
        }
      } else if (draft) {
        generationStatus = draft.isAccepted ? 'completed' : 'completed';
      }
      
      return {
        section,
        depth: section.number.split('.').length - 1,
        hasChildren: (section.subsections?.length ?? 0) > 0,
        isExpanded: expandedSections.has(section.id),
        dependencies: graphEntry?.deps ?? [],
        dependents: graphEntry?.dependents ?? [],
        canGenerate: depsComplete && !isGenerating,
        generationStatus,
      };
    });
  }, [flatSections, dependencyGraph, sectionDrafts, expandedSections, batchState, isGenerating, generatingSection]);
  
  // Calculate progress
  const progress = useMemo(() => {
    const total = flatSections.length;
    const completed = flatSections.filter(s => 
      sectionDrafts[s.id]?.isAccepted || s.status === 'approved'
    ).length;
    const inProgress = flatSections.filter(s =>
      sectionDrafts[s.id] && !sectionDrafts[s.id].isAccepted
    ).length;
    
    return {
      total,
      completed,
      inProgress,
      notStarted: total - completed - inProgress,
      percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  }, [flatSections, sectionDrafts]);
  
  // Toggle section expansion
  const toggleExpanded = useCallback((sectionId: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  }, []);
  
  // Toggle section selection
  const toggleSelected = useCallback((sectionId: string) => {
    setSelectedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  }, []);
  
  // Select all sections
  const selectAll = useCallback(() => {
    setSelectedSections(new Set(flatSections.map(s => s.id)));
  }, [flatSections]);
  
  // Clear selection
  const clearSelection = useCallback(() => {
    setSelectedSections(new Set());
  }, []);
  
  // Generate single section
  const generateSection = useCallback(async (sectionId: string) => {
    const section = flatSections.find(s => s.id === sectionId);
    if (!section) return false;
    
    const selectedSources = availableSources.filter(s => selectedSourceIds.has(s.id));
    if (selectedSources.length === 0) {
      toast.warning('Please select source documents before generating');
      return false;
    }
    
    startGeneration(sectionId);
    
    try {
      // Build DocumentSection from flat section
      const docSection = {
        id: section.id,
        number: section.number,
        title: section.title,
        level: section.level || 1,
        status: 'draft',
        progress: 0,
        content: '',
        contentBlocks: [],
        wordCount: 0,
        comments: [],
        hasUnresolvedComments: false,
        sourceLinks: [],
        tflLinks: [],
        required: true,
      } as unknown as DocumentSection;
      
      const result = await generateSectionContent(
        docSection,
        document.documentType,
        {
          productName: document.productName,
          studyName: document.studyName,
          indication: document.indication,
        },
        selectedSources
      );
      
      completeGeneration(sectionId, {
        content: result.content,
        citations: result.citations,
        generatedAt: new Date(),
        sourceIds: selectedSources.map(s => s.id),
        isAccepted: false,
        wordCount: result.content.split(/\s+/).length,
      });
      
      onSectionGenerated?.(sectionId, result.content, result.citations);
      return true;
    } catch (error) {
      console.error('Section generation failed:', error);
      failGeneration();
      return false;
    }
  }, [flatSections, availableSources, selectedSourceIds, document, startGeneration, completeGeneration, failGeneration, onSectionGenerated, toast]);
  
  // Batch generation effect
  useEffect(() => {
    if (!batchState.isRunning || batchState.isPaused) return;
    if (batchState.currentIndex >= batchState.queue.length) {
      // Batch complete
      const duration = Date.now() - batchStartTime;
      setBatchState(prev => ({ ...prev, isRunning: false }));
      onBatchComplete?.({
        totalSections: batchState.queue.length,
        completed: batchState.completed.length,
        failed: batchState.failed.length,
        skipped: batchState.skipped.length,
        duration,
      });
      toast.success(`Batch generation complete: ${batchState.completed.length} sections generated`);
      return;
    }
    
    const currentSectionId = batchState.queue[batchState.currentIndex];
    const section = flatSections.find(s => s.id === currentSectionId);
    
    if (!section) {
      setBatchState(prev => ({
        ...prev,
        currentIndex: prev.currentIndex + 1,
        skipped: [...prev.skipped, currentSectionId],
      }));
      return;
    }
    
    // Check if already complete and should skip
    if (skipCompleted && (sectionDrafts[currentSectionId]?.isAccepted || section.status === 'approved')) {
      setBatchState(prev => ({
        ...prev,
        currentIndex: prev.currentIndex + 1,
        skipped: [...prev.skipped, currentSectionId],
      }));
      return;
    }
    
    // Check dependencies
    const graphEntry = dependencyGraph.get(currentSectionId);
    const depsComplete = graphEntry?.deps.every(depId => {
      const depDraft = sectionDrafts[depId];
      const depSection = flatSections.find(s => s.id === depId);
      return depDraft?.isAccepted || depSection?.status === 'approved' || batchState.completed.includes(depId);
    }) ?? true;
    
    if (!depsComplete) {
      toast.info(`Skipping ${section.number} - dependencies not complete`);
      setBatchState(prev => ({
        ...prev,
        currentIndex: prev.currentIndex + 1,
        skipped: [...prev.skipped, currentSectionId],
      }));
      return;
    }
    
    // Generate the section
    if (!isGenerating) {
      generateSection(currentSectionId).then(success => {
        setBatchState(prev => {
          if (success) {
            return {
              ...prev,
              currentIndex: prev.currentIndex + 1,
              completed: [...prev.completed, currentSectionId],
            };
          } else {
            if (pauseOnError) {
              toast.error(`Generation failed for ${section.number}. Batch paused.`);
              return {
                ...prev,
                isPaused: true,
                failed: [...prev.failed, currentSectionId],
              };
            }
            return {
              ...prev,
              currentIndex: prev.currentIndex + 1,
              failed: [...prev.failed, currentSectionId],
            };
          }
        });
      });
    }
  }, [batchState, isGenerating, flatSections, sectionDrafts, dependencyGraph, skipCompleted, pauseOnError, generateSection, batchStartTime, onBatchComplete, toast]);
  
  // Start batch generation
  const startBatch = useCallback(() => {
    let queue: string[];
    
    if (generationMode === 'selected' && selectedSections.size > 0) {
      // Generate selected sections in order
      queue = flatSections
        .filter(s => selectedSections.has(s.id))
        .map(s => s.id);
    } else {
      // Generate all sections sequentially
      queue = flatSections.map(s => s.id);
    }
    
    if (queue.length === 0) {
      toast.warning('No sections to generate');
      return;
    }
    
    setBatchStartTime(Date.now());
    setBatchState({
      isRunning: true,
      isPaused: false,
      queue,
      currentIndex: 0,
      completed: [],
      failed: [],
      skipped: [],
    });
    
    toast.info(`Starting batch generation for ${queue.length} sections`);
  }, [generationMode, selectedSections, flatSections, toast]);
  
  // Pause batch
  const pauseBatch = useCallback(() => {
    setBatchState(prev => ({ ...prev, isPaused: true }));
    toast.info('Batch generation paused');
  }, [toast]);
  
  // Resume batch
  const resumeBatch = useCallback(() => {
    setBatchState(prev => ({ ...prev, isPaused: false }));
    toast.info('Resuming batch generation');
  }, [toast]);
  
  // Stop batch
  const stopBatch = useCallback(() => {
    setBatchState(prev => ({ ...prev, isRunning: false, isPaused: false }));
    toast.info('Batch generation stopped');
  }, [toast]);
  
  // Skip current
  const skipCurrent = useCallback(() => {
    setBatchState(prev => ({
      ...prev,
      currentIndex: prev.currentIndex + 1,
      skipped: [...prev.skipped, prev.queue[prev.currentIndex]],
    }));
  }, []);
  
  return (
    <div className="flex flex-col h-full bg-white rounded-lg border border-slate-200">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-violet-50 rounded-lg">
            <Wand2 className="w-5 h-5 text-violet-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">AI Section Generation</h2>
            <p className="text-sm text-slate-500">{document.title}</p>
          </div>
        </div>
        
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <Settings2 className="w-5 h-5" />
        </button>
      </div>
      
      {/* Settings Panel */}
      {showSettings && (
        <div className="p-4 bg-slate-50 border-b border-slate-200">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-700">Generation Mode</label>
              <select
                value={generationMode}
                onChange={(e) => setGenerationMode(e.target.value as 'sequential' | 'selected')}
                className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              >
                <option value="sequential">Sequential (All Sections)</option>
                <option value="selected">Selected Sections Only</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={skipCompleted}
                  onChange={(e) => setSkipCompleted(e.target.checked)}
                  className="rounded border-slate-300"
                />
                <span>Skip completed sections</span>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={pauseOnError}
                  onChange={(e) => setPauseOnError(e.target.checked)}
                  className="rounded border-slate-300"
                />
                <span>Pause on error</span>
              </label>
            </div>
          </div>
        </div>
      )}
      
      {/* Progress Bar */}
      <div className="p-4 border-b border-slate-200">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-slate-700">
            Document Progress
          </span>
          <span className="text-sm text-slate-500">
            {progress.completed}/{progress.total} sections ({progress.percentage}%)
          </span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full flex">
            <div
              className="bg-emerald-500 transition-all duration-300"
              style={{ width: `${(progress.completed / progress.total) * 100}%` }}
            />
            <div
              className="bg-amber-400 transition-all duration-300"
              style={{ width: `${(progress.inProgress / progress.total) * 100}%` }}
            />
          </div>
        </div>
        <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Complete ({progress.completed})
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            In Progress ({progress.inProgress})
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-slate-200" />
            Not Started ({progress.notStarted})
          </span>
        </div>
      </div>
      
      {/* Batch Controls */}
      <div className="p-4 border-b border-slate-200 bg-slate-50">
        <div className="flex items-center gap-3">
          {!batchState.isRunning ? (
            <button
              onClick={startBatch}
              disabled={isGenerating || selectedSourceIds.size === 0}
              className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Zap className="w-4 h-4" />
              {generationMode === 'selected' && selectedSections.size > 0
                ? `Generate ${selectedSections.size} Selected`
                : 'Generate All Sections'
              }
            </button>
          ) : (
            <>
              {batchState.isPaused ? (
                <button
                  onClick={resumeBatch}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                >
                  <Play className="w-4 h-4" />
                  Resume
                </button>
              ) : (
                <button
                  onClick={pauseBatch}
                  className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600"
                >
                  <Pause className="w-4 h-4" />
                  Pause
                </button>
              )}
              <button
                onClick={skipCurrent}
                disabled={!batchState.isRunning || batchState.isPaused}
                className="flex items-center gap-2 px-3 py-2 text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50"
              >
                <SkipForward className="w-4 h-4" />
                Skip
              </button>
              <button
                onClick={stopBatch}
                className="flex items-center gap-2 px-3 py-2 text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50"
              >
                <StopCircle className="w-4 h-4" />
                Stop
              </button>
            </>
          )}
          
          {generationMode === 'selected' && (
            <div className="flex items-center gap-2 ml-auto">
              <button
                onClick={selectAll}
                className="text-sm text-violet-600 hover:text-violet-800"
              >
                Select All
              </button>
              <span className="text-slate-300">|</span>
              <button
                onClick={clearSelection}
                className="text-sm text-slate-500 hover:text-slate-700"
              >
                Clear
              </button>
            </div>
          )}
        </div>
        
        {/* Batch Progress */}
        {batchState.isRunning && (
          <div className="mt-3 p-3 bg-white rounded-lg border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-700">
                Batch Progress
              </span>
              <span className="text-sm text-slate-500">
                {batchState.currentIndex}/{batchState.queue.length}
                {batchState.isPaused && ' (Paused)'}
              </span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${batchState.isPaused ? 'bg-amber-400' : 'bg-violet-500'}`}
                style={{ width: `${(batchState.currentIndex / batchState.queue.length) * 100}%` }}
              />
            </div>
            <div className="flex items-center gap-4 mt-2 text-xs">
              <span className="text-emerald-600">✓ {batchState.completed.length} completed</span>
              <span className="text-red-500">✗ {batchState.failed.length} failed</span>
              <span className="text-slate-400">↷ {batchState.skipped.length} skipped</span>
            </div>
          </div>
        )}
      </div>
      
      {/* Section List */}
      <div className="flex-1 overflow-y-auto">
        {sectionNodes.map((node) => (
          <SectionRow
            key={node.section.id}
            node={node}
            isSelected={selectedSections.has(node.section.id)}
            generationMode={generationMode}
            isGenerating={generatingSection === node.section.id}
            hasDraft={!!sectionDrafts[node.section.id]}
            draftAccepted={sectionDrafts[node.section.id]?.isAccepted ?? false}
            onToggleExpand={() => toggleExpanded(node.section.id)}
            onToggleSelect={() => toggleSelected(node.section.id)}
            onGenerate={() => generateSection(node.section.id)}
          />
        ))}
      </div>
      
      {/* Source Documents Indicator */}
      <div className="p-3 border-t border-slate-200 bg-slate-50">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-slate-600">
            <FileText className="w-4 h-4" />
            <span>{selectedSourceIds.size} source documents selected</span>
          </div>
          {selectedSourceIds.size === 0 && (
            <span className="flex items-center gap-1 text-amber-600">
              <AlertTriangle className="w-4 h-4" />
              Select sources to enable generation
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// SECTION ROW COMPONENT
// ============================================================================

interface SectionRowProps {
  node: SectionNode;
  isSelected: boolean;
  generationMode: 'sequential' | 'selected';
  isGenerating: boolean;
  hasDraft: boolean;
  draftAccepted: boolean;
  onToggleExpand: () => void;
  onToggleSelect: () => void;
  onGenerate: () => void;
}

function SectionRow({
  node,
  isSelected,
  generationMode,
  isGenerating,
  hasDraft,
  draftAccepted,
  onToggleExpand,
  onToggleSelect,
  onGenerate,
}: SectionRowProps) {
  const { section, depth, hasChildren, dependencies, canGenerate, generationStatus } = node;
  
  const getStatusIcon = () => {
    if (isGenerating) {
      return <Loader2 className="w-4 h-4 text-violet-500 animate-spin" />;
    }
    
    switch (section.status) {
      case 'approved':
        return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case 'in-review':
      case 'ready-for-review':
        return <Clock className="w-4 h-4 text-amber-500" />;
      case 'in-progress':
        return <CircleDashed className="w-4 h-4 text-blue-500" />;
      case 'revisions-needed':
        return <AlertCircle className="w-4 h-4 text-orange-500" />;
      default:
        if (draftAccepted) {
          return <CheckCircle className="w-4 h-4 text-emerald-500" />;
        }
        if (hasDraft) {
          return <Sparkles className="w-4 h-4 text-violet-500" />;
        }
        return <Circle className="w-4 h-4 text-slate-300" />;
    }
  };
  
  const getStatusBadge = () => {
    if (generationStatus === 'generating') {
      return (
        <span className="px-2 py-0.5 text-xs font-medium bg-violet-100 text-violet-700 rounded-full">
          Generating...
        </span>
      );
    }
    if (generationStatus === 'pending') {
      return (
        <span className="px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-600 rounded-full">
          Queued
        </span>
      );
    }
    if (draftAccepted) {
      return (
        <span className="px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700 rounded-full">
          Generated
        </span>
      );
    }
    if (hasDraft) {
      return (
        <span className="px-2 py-0.5 text-xs font-medium bg-violet-100 text-violet-700 rounded-full">
          Draft Ready
        </span>
      );
    }
    if (dependencies.length > 0 && !canGenerate) {
      return (
        <span className="px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded-full flex items-center gap-1">
          <Lock className="w-3 h-3" />
          Awaiting Dependencies
        </span>
      );
    }
    return null;
  };
  
  return (
    <div
      className={`
        flex items-center gap-3 px-4 py-3 border-b border-slate-100 hover:bg-slate-50 transition-colors
        ${isSelected ? 'bg-violet-50' : ''}
        ${isGenerating ? 'bg-violet-50/50' : ''}
      `}
      style={{ paddingLeft: `${16 + depth * 20}px` }}
    >
      {/* Expand/Collapse or Spacer */}
      <div className="w-5 flex-shrink-0">
        {hasChildren ? (
          <button
            onClick={onToggleExpand}
            className="p-0.5 text-slate-400 hover:text-slate-600 rounded"
          >
            {node.isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
        ) : null}
      </div>
      
      {/* Selection Checkbox (in selected mode) */}
      {generationMode === 'selected' && (
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggleSelect}
          className="w-4 h-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
        />
      )}
      
      {/* Status Icon */}
      <div className="flex-shrink-0">
        {getStatusIcon()}
      </div>
      
      {/* Section Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm text-slate-500">{section.number}</span>
          <span className="text-sm font-medium text-slate-900 truncate">{section.title}</span>
        </div>
        {section.wordCount > 0 && (
          <span className="text-xs text-slate-400">{section.wordCount} words</span>
        )}
      </div>
      
      {/* Status Badge */}
      <div className="flex-shrink-0">
        {getStatusBadge()}
      </div>
      
      {/* Generate Button */}
      <div className="flex-shrink-0">
        <button
          onClick={onGenerate}
          disabled={!canGenerate || isGenerating || draftAccepted}
          className={`
            flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors
            ${canGenerate && !draftAccepted
              ? 'text-violet-600 hover:bg-violet-100'
              : 'text-slate-400 cursor-not-allowed'
            }
          `}
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Generating
            </>
          ) : draftAccepted ? (
            <>
              <RefreshCw className="w-4 h-4" />
              Regenerate
            </>
          ) : (
            <>
              <Wand2 className="w-4 h-4" />
              Generate
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// DOCUMENT OUTLINE PANEL (for standalone use)
// ============================================================================

interface DocumentOutlinePanelProps {
  sections: DocumentSection[];
  selectedSectionId?: string;
  sectionDrafts?: Record<string, SectionDraft>;
  onSectionSelect?: (sectionId: string) => void;
  compact?: boolean;
}

export function DocumentOutlinePanel({
  sections,
  selectedSectionId,
  sectionDrafts = {},
  onSectionSelect,
  compact = false,
}: DocumentOutlinePanelProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  
  const flatSections = useMemo(() => flattenSections(sections), [sections]);
  
  const toggleExpanded = useCallback((sectionId: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  }, []);
  
  const getStatusColor = (section: DocumentSection): string => {
    const draft = sectionDrafts[section.id];
    
    if (draft?.isAccepted || section.status === 'approved') {
      return 'bg-emerald-500';
    }
    if (draft) {
      return 'bg-violet-500';
    }
    if (section.status === 'in-progress') {
      return 'bg-blue-500';
    }
    if (section.status === 'in-review' || section.status === 'ready-for-review') {
      return 'bg-amber-500';
    }
    return 'bg-slate-300';
  };
  
  return (
    <div className={`bg-white rounded-lg border border-slate-200 ${compact ? '' : 'h-full'}`}>
      {!compact && (
        <div className="p-3 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <ListTree className="w-4 h-4 text-slate-500" />
            <span className="text-sm font-medium text-slate-700">Document Outline</span>
          </div>
        </div>
      )}
      
      <div className={`overflow-y-auto ${compact ? 'max-h-64' : 'flex-1'}`}>
        {flatSections.map(section => {
          const depth = section.number.split('.').length - 1;
          const hasChildren = (section.subsections?.length ?? 0) > 0;
          const isExpanded = expandedSections.has(section.id);
          const isSelected = selectedSectionId === section.id;
          
          return (
            <div
              key={section.id}
              onClick={() => onSectionSelect?.(section.id)}
              className={`
                flex items-center gap-2 px-3 py-2 cursor-pointer border-b border-slate-50
                hover:bg-slate-50 transition-colors
                ${isSelected ? 'bg-violet-50 border-l-2 border-l-violet-500' : ''}
              `}
              style={{ paddingLeft: `${12 + depth * 16}px` }}
            >
              {hasChildren && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleExpanded(section.id);
                  }}
                  className="p-0.5 text-slate-400 hover:text-slate-600"
                >
                  {isExpanded ? (
                    <ChevronDown className="w-3 h-3" />
                  ) : (
                    <ChevronRight className="w-3 h-3" />
                  )}
                </button>
              )}
              
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${getStatusColor(section)}`} />
              
              <span className="text-xs font-mono text-slate-400">{section.number}</span>
              <span className="text-sm text-slate-700 truncate">{section.title}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default SectionGenerationWorkflow;
