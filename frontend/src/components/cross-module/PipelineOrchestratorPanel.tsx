

/**
 * Pipeline Orchestrator Panel
 * 
 * Visualizes active data flow pipelines and their step progress.
 * Allows starting/stopping pipelines and monitoring multi-step workflows.
 * 
 * @module components/cross-module/PipelineOrchestratorPanel
 * @version 0.27.47
 */

import { useState, useMemo, useEffect } from 'react';
import {
  Workflow, Play, Square, ArrowRight, CheckCircle2, Clock, XCircle,
  AlertTriangle, ChevronDown, ChevronRight, RefreshCw, Zap, Settings,
  FileText, Shield, Activity, Beaker, FlaskConical, BookOpen, Send,
  Database, Archive, BarChart3, ClipboardList, FolderOpen, FileQuestion,
  Layers, Microscope, TestTube, Building2, Package, Plus, Loader2,
  Link,
  Sparkles,
  ClipboardCheck,
} from 'lucide-react';
import {
  useCrossModuleStore,
  useActivePipelines,
  type ModuleType,
  type DataFlowPipeline,
  type DataFlowStep,
  PREDEFINED_PIPELINES,
  MODULE_LABELS,
  MODULE_SHORT_LABELS,
} from '@/store/useCrossModuleStore';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { 
  startPipelineExecution, 
  getExecutionState,
  type PipelineExecutionState 
} from '@/lib/pipeline-execution';

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

// Pipeline template metadata
const PIPELINE_TEMPLATES: Record<string, { name: string; description: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  'lslv-to-submission': {
    name: 'LSLV to Submission',
    description: 'Last Subject Last Visit → Submission-ready package',
    icon: Send,
    color: 'text-green-400',
  },
  'signal-to-label': {
    name: 'Safety Signal to Label',
    description: 'Validated safety signal → Label update submission',
    icon: Shield,
    color: 'text-red-400',
  },
  'lab-to-m4': {
    name: 'Lab to Module 4',
    description: 'GLP study completion → Nonclinical submission package',
    icon: FlaskConical,
    color: 'text-emerald-400',
  },
};

// =============================================================================
// PIPELINE STEP COMPONENT - v0.27.71 Enhanced with Real-time Feedback
// =============================================================================

type StepStatus = 'pending' | 'in-progress' | 'completed' | 'failed';

interface PipelineStepProps {
  step: DataFlowStep;
  status: StepStatus;
  isLast?: boolean;
  stepNumber?: number;
  totalSteps?: number;
  elapsedMs?: number;
  compact?: boolean;
}

function PipelineStep({ 
  step, 
  status, 
  isLast = false, 
  stepNumber,
  totalSteps,
  elapsedMs,
  compact = false 
}: PipelineStepProps) {
  const sourceModule = MODULE_METADATA[step.sourceModule];
  const targetModule = MODULE_METADATA[step.targetModule];
  const SourceIcon = sourceModule.icon;
  const TargetIcon = targetModule.icon;
  
  const statusConfig = {
    pending: { 
      icon: Clock, 
      color: 'text-slate-400', 
      bgColor: 'bg-slate-500/20', 
      borderColor: 'border-slate-500/30',
      pulseClass: '',
      glowClass: '',
    },
    'in-progress': { 
      icon: Loader2, 
      color: 'text-blue-400', 
      bgColor: 'bg-blue-500/20', 
      borderColor: 'border-blue-500/60',
      pulseClass: 'animate-pulse',
      glowClass: 'shadow-lg shadow-blue-500/30 ring-2 ring-blue-400/40',
    },
    completed: { 
      icon: CheckCircle2, 
      color: 'text-green-400', 
      bgColor: 'bg-green-500/20', 
      borderColor: 'border-green-500/40',
      pulseClass: '',
      glowClass: '',
    },
    failed: { 
      icon: XCircle, 
      color: 'text-red-400', 
      bgColor: 'bg-red-500/20', 
      borderColor: 'border-red-500/40',
      pulseClass: '',
      glowClass: 'shadow-red-500/30',
    },
  }[status];
  
  const StatusIcon = statusConfig.icon;
  
  // Format elapsed time
  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };
  
  if (compact) {
    // Compact view for tight spaces - v0.27.71 Enhanced
    return (
      <div className="flex items-center">
        <div className={`relative p-2 rounded-lg border transition-all duration-300 ${statusConfig.borderColor} ${statusConfig.bgColor} ${statusConfig.glowClass}`}>
          <div className="flex items-center gap-2">
            <div className={`p-1 rounded ${sourceModule.bgColor} ${status === 'in-progress' ? 'ring-1 ring-blue-400/50' : ''}`}>
              <SourceIcon className={`w-3 h-3 ${sourceModule?.color ?? ''}`} />
            </div>
            <div className="relative w-6">
              <ArrowRight className={`w-3 h-3 ${status === 'in-progress' ? 'text-blue-400' : status === 'completed' ? 'text-green-400' : 'text-slate-600'}`} />
              {status === 'in-progress' && (
                <div className="absolute inset-0 flex items-center overflow-hidden">
                  <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-[slideRight_0.6s_ease-in-out_infinite]" />
                </div>
              )}
            </div>
            <div className={`p-1 rounded ${targetModule.bgColor} ${status === 'in-progress' ? 'ring-1 ring-blue-400/50' : ''}`}>
              <TargetIcon className={`w-3 h-3 ${targetModule?.color ?? ''}`} />
            </div>
          </div>
          {/* Active indicator */}
          {status === 'in-progress' && (
            <>
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-ping" />
              </div>
              <div className="absolute -top-2 left-1/2 -translate-x-1/2 px-1.5 py-0.5 bg-blue-500 rounded text-[9px] text-white font-medium whitespace-nowrap">
                ACTIVE
              </div>
            </>
          )}
          {status === 'completed' && (
            <div className="absolute -top-1 -right-1 bg-slate-900 rounded-full p-0.5">
              <CheckCircle2 className="w-3 h-3 text-green-400" />
            </div>
          )}
        </div>
        {!isLast && (
          <div className={`relative w-8 h-0.5 ${status === 'completed' ? 'bg-green-500' : 'bg-slate-700'}`}>
            {status === 'completed' && (
              <div className="absolute inset-0 bg-gradient-to-r from-green-500/50 to-transparent animate-pulse" />
            )}
          </div>
        )}
      </div>
    );
  }
  
  return (
    <div className="flex items-center">
      {/* Step card */}
      <div className={`flex-1 p-3 rounded-lg border transition-all duration-300 ${statusConfig.borderColor} ${statusConfig.bgColor} ${statusConfig.pulseClass}`}>
        {/* Step header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {stepNumber && totalSteps && (
              <span className={`text-xs px-1.5 py-0.5 rounded ${
                status === 'completed' ? 'bg-green-500/30 text-green-400' :
                status === 'in-progress' ? 'bg-blue-500/30 text-blue-400' :
                'bg-slate-500/30 text-slate-400'
              }`}>
                {stepNumber}/{totalSteps}
              </span>
            )}
            <span className="text-xs font-medium text-white">{step.name}</span>
          </div>
          <div className="flex items-center gap-2">
            {status === 'in-progress' && elapsedMs !== undefined && (
              <span className="text-xs text-blue-400 font-mono">
                {formatTime(elapsedMs)}
              </span>
            )}
            <StatusIcon className={`w-3.5 h-3.5 ${statusConfig?.color ?? ''} ${status === 'in-progress' ? 'animate-spin' : ''}`} />
          </div>
        </div>
        
        {/* Module flow with animated connector */}
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded ${sourceModule.bgColor} ${status === 'in-progress' ? 'ring-1 ring-blue-400/50' : ''}`}>
            <SourceIcon className={`w-3.5 h-3.5 ${sourceModule?.color ?? ''}`} />
          </div>
          <span className="text-xs text-slate-400">{MODULE_SHORT_LABELS[step.sourceModule]}</span>
          
          {/* Animated data flow indicator */}
          <div className="relative flex items-center">
            <div className={`w-8 h-0.5 ${status === 'completed' ? 'bg-green-500' : status === 'in-progress' ? 'bg-blue-500' : 'bg-slate-600'}`} />
            {status === 'in-progress' && (
              <div className="absolute inset-0 overflow-hidden">
                <div className="w-2 h-0.5 bg-white rounded animate-[slideRight_0.8s_ease-in-out_infinite]" />
              </div>
            )}
            <ArrowRight className={`w-3.5 h-3.5 ${
              status === 'completed' ? 'text-green-400' : 
              status === 'in-progress' ? 'text-blue-400' : 
              'text-slate-600'
            }`} />
          </div>
          
          <div className={`p-1.5 rounded ${targetModule.bgColor} ${status === 'in-progress' ? 'ring-1 ring-blue-400/50' : ''}`}>
            <TargetIcon className={`w-3.5 h-3.5 ${targetModule?.color ?? ''}`} />
          </div>
          <span className="text-xs text-slate-400">{MODULE_SHORT_LABELS[step.targetModule]}</span>
        </div>
        
        {/* Handoff type */}
        <div className="flex items-center justify-between mt-1">
          <span className="text-xs text-slate-500">
            {step.handoffType.replace(/-/g, ' ')}
          </span>
          {status === 'completed' && (
            <span className="text-xs text-green-400 flex items-center gap-1">
              <Zap className="w-3 h-3" />
              Done
            </span>
          )}
        </div>
      </div>
      
      {/* Connector arrow with flow animation */}
      {!isLast && (
        <div className="w-8 flex-shrink-0 flex items-center justify-center relative">
          <div className={`absolute w-full h-0.5 ${status === 'completed' ? 'bg-green-500' : 'bg-slate-700'}`} />
          <ArrowRight className={`w-4 h-4 relative z-10 ${status === 'completed' ? 'text-green-400' : 'text-slate-600'}`} />
        </div>
      )}
    </div>
  );
}

// =============================================================================
// ACTIVE PIPELINE CARD - v0.27.65 Enhanced
// =============================================================================

interface ActivePipelineCardProps {
  pipeline: DataFlowPipeline;
  onStop?: (pipelineId: string) => void;
}

function ActivePipelineCard({ pipeline, onStop }: ActivePipelineCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [viewMode, setViewMode] = useState<'detailed' | 'timeline'>('detailed');
  const [executionState, setExecutionState] = useState<PipelineExecutionState | undefined>();
  const [totalElapsedMs, setTotalElapsedMs] = useState(0);
  
  // Poll for execution state updates and elapsed time
  useEffect(() => {
    const updateState = () => {
      const state = getExecutionState(pipeline.id);
      setExecutionState(state);
      
      // Calculate total elapsed time
      if (state?.startedAt) {
        const endTime = state.completedAt ? new Date(state.completedAt).getTime() : Date.now();
        setTotalElapsedMs(endTime - new Date(state.startedAt).getTime());
      }
    };
    
    updateState();
    const interval = setInterval(updateState, 100); // Faster polling for smooth timer
    return () => clearInterval(interval);
  }, [pipeline.id]);
  
  // Calculate progress from execution state
  const getStepStatus = (index: number): StepStatus => {
    if (!executionState) {
      return index === 0 ? 'in-progress' : 'pending';
    }
    
    const stepId = pipeline.steps[index]?.id;
    const stepResult = stepId ? executionState.stepResults[stepId] : undefined;
    
    if (!stepResult) return 'pending';
    if (stepResult.status === 'completed') return 'completed';
    if (stepResult.status === 'running') return 'in-progress';
    if (stepResult.status === 'failed') return 'failed';
    if (stepResult.status === 'skipped') return 'completed';
    return 'pending';
  };
  
  // Get elapsed time for a specific step
  const getStepElapsedMs = (index: number): number | undefined => {
    if (!executionState) return undefined;
    const stepId = pipeline.steps[index]?.id;
    const stepResult = stepId ? executionState.stepResults[stepId] : undefined;
    if (!stepResult?.startedAt) return undefined;
    const endTime = stepResult.completedAt ? new Date(stepResult.completedAt).getTime() : Date.now();
    return endTime - new Date(stepResult.startedAt).getTime();
  };
  
  // Calculate completion progress
  const completedSteps = executionState 
    ? Object.values(executionState.stepResults).filter(r => r.status === 'completed' || r.status === 'skipped').length
    : 0;
  const progress = Math.round((completedSteps / pipeline.steps.length) * 100);
  const isRunning = executionState?.status === 'running';
  const isCompleted = executionState?.status === 'completed';
  const currentStepIndex = executionState?.currentStepIndex ?? 0;
  
  // Format time
  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    const mins = Math.floor(ms / 60000);
    const secs = Math.floor((ms % 60000) / 1000);
    return `${mins}m ${secs}s`;
  };
  
  return (
    <div className={`border rounded-lg overflow-hidden transition-all duration-300 ${
      isRunning ? 'border-blue-500/50 shadow-lg shadow-blue-500/10' : 
      isCompleted ? 'border-green-500/50' : 
      'border-slate-700'
    }`}>
      {/* Header */}
      <div className={`flex items-center gap-3 px-4 py-3 ${
        isRunning ? 'bg-blue-500/10' : isCompleted ? 'bg-green-500/10' : 'bg-slate-800/50'
      }`}>
        <div className={`p-1.5 rounded ${isCompleted ? 'bg-green-500/20' : isRunning ? 'bg-blue-500/20' : 'bg-slate-500/20'}`}>
          {isRunning ? (
            <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
          ) : isCompleted ? (
            <CheckCircle2 className="w-4 h-4 text-green-400" />
          ) : (
            <Workflow className="w-4 h-4 text-slate-400" />
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-medium text-white truncate">{pipeline.name}</h4>
            {isRunning && (
              <Badge className="bg-blue-500/20 text-blue-400 border-0 text-xs">
                <span className="inline-block w-1.5 h-1.5 bg-blue-400 rounded-full mr-1.5 animate-pulse" />
                RUNNING
              </Badge>
            )}
            {isCompleted && (
              <Badge className="bg-green-500/20 text-green-400 border-0 text-xs">
                <Zap className="w-3 h-3 mr-1" />
                COMPLETE
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span>Step {Math.min(currentStepIndex + 1, pipeline.steps.length)}/{pipeline.steps.length}</span>
            {(isRunning || isCompleted) && (
              <span className={`font-mono ${isRunning ? 'text-blue-400' : 'text-green-400'}`}>
                {formatTime(totalElapsedMs)}
              </span>
            )}
          </div>
        </div>
        
        {/* Progress */}
        <div className="flex items-center gap-3">
          <div className="w-32">
            <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${
                  isCompleted ? 'bg-green-500' : 'bg-blue-500'
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>{completedSteps} done</span>
              <span>{progress}%</span>
            </div>
          </div>
          
          {/* View mode toggle */}
          {isExpanded && (
            <div className="flex items-center bg-slate-800 rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('detailed')}
                className={`px-2 py-1 text-xs ${viewMode === 'detailed' ? 'bg-slate-700 text-white' : 'text-slate-400'}`}
              >
                Detailed
              </button>
              <button
                onClick={() => setViewMode('timeline')}
                className={`px-2 py-1 text-xs ${viewMode === 'timeline' ? 'bg-slate-700 text-white' : 'text-slate-400'}`}
              >
                Timeline
              </button>
            </div>
          )}
        </div>
        
        {/* Actions */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1.5 hover:bg-white/5 rounded transition-colors"
        >
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-slate-400" />
          )}
        </button>
        
        {onStop && isRunning && (
          <button
            onClick={() => onStop(pipeline.id)}
            className="p-1.5 hover:bg-red-500/10 rounded text-slate-400 hover:text-red-400 transition-colors"
            title="Stop pipeline"
          >
            <Square className="w-4 h-4" />
          </button>
        )}
      </div>
      
      {/* Steps */}
      {isExpanded && (
        <div className="p-4 bg-slate-900/30 border-t border-slate-700/50">
          {viewMode === 'timeline' ? (
            /* Compact Timeline View */
            <div className="flex items-center justify-center gap-1 py-2">
              {pipeline.steps.map((step, index) => (
                <PipelineStep
                  key={step.id}
                  step={step}
                  status={getStepStatus(index)}
                  isLast={index === pipeline.steps.length - 1}
                  compact={true}
                />
              ))}
            </div>
          ) : (
            /* Detailed View */
            <div className="flex items-center gap-1 overflow-x-auto pb-2">
              {pipeline.steps.map((step, index) => (
                <PipelineStep
                  key={step.id}
                  step={step}
                  status={getStepStatus(index)}
                  isLast={index === pipeline.steps.length - 1}
                  stepNumber={index + 1}
                  totalSteps={pipeline.steps.length}
                  elapsedMs={getStepStatus(index) === 'in-progress' ? getStepElapsedMs(index) : undefined}
                />
              ))}
            </div>
          )}
          
          {/* Pipeline metadata */}
          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-700/50 text-xs text-slate-500">
            <span>Started: {new Date(pipeline.createdAt).toLocaleTimeString()}</span>
            <span>Trigger: {pipeline.trigger.type}</span>
            <span>{pipeline.steps.length} steps</span>
            {isCompleted && (
              <span className="text-green-400 font-medium">
                Completed in {formatTime(totalElapsedMs)}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// PIPELINE TEMPLATE CARD
// =============================================================================

interface PipelineTemplateCardProps {
  templateId: string;
  template: Partial<DataFlowPipeline>;
  onStart?: (templateId: string) => void;
}

function PipelineTemplateCard({ templateId, template, onStart }: PipelineTemplateCardProps) {
  const meta = PIPELINE_TEMPLATES[templateId] || {
    name: template.name || templateId,
    description: template.description || '',
    icon: Workflow,
    color: 'text-blue-400',
  };
  const TemplateIcon = meta.icon;
  
  return (
    <div className="p-4 border border-slate-700 rounded-lg hover:border-slate-600 transition-colors">
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg bg-slate-800`}>
          <TemplateIcon className={`w-5 h-5 ${meta?.color ?? ''}`} />
        </div>
        
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-white">{meta.name}</h4>
          <p className="text-xs text-slate-400 mt-0.5">{meta.description}</p>
          
          {/* Step preview */}
          {template.steps && template.steps.length > 0 && (
            <div className="flex items-center gap-1 mt-2 overflow-x-auto">
              {template.steps.map((step, index) => {
                const sourceModule = MODULE_METADATA[step.sourceModule];
                const SourceIcon = sourceModule.icon;
                return (
                  <div key={step.id} className="flex items-center">
                    <div className={`p-1 rounded ${sourceModule.bgColor}`}>
                      <SourceIcon className={`w-3 h-3 ${sourceModule?.color ?? ''}`} />
                    </div>
                    {index < (template.steps?.length || 0) - 1 && (
                      <ArrowRight className="w-3 h-3 text-slate-600 mx-0.5" />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
        
        {onStart && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onStart(templateId)}
            className="gap-1"
          >
            <Play className="w-3.5 h-3.5" />
            Start
          </Button>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

interface PipelineOrchestratorPanelProps {
  /** Show predefined pipeline templates */
  showTemplates?: boolean;
  /** Allow starting new pipelines */
  allowStart?: boolean;
  /** Allow stopping pipelines */
  allowStop?: boolean;
  /** Title override */
  title?: string;
  /** CSS class for container */
  className?: string;
}

export function PipelineOrchestratorPanel({
  showTemplates = true,
  allowStart = true,
  allowStop = true,
  title = 'Data Flow Pipelines',
  className = '',
}: PipelineOrchestratorPanelProps) {
  const [activeTab, setActiveTab] = useState<'active' | 'templates' | 'history'>('active');
  const [executingPipelines, setExecutingPipelines] = useState<Set<string>>(new Set());
  
  // Get pipelines from store
  const activePipelines = useCrossModuleStore(state => state.getActivePipelines());
  const pipelineHistory = useCrossModuleStore(state => state.getPipelineHistory(20));
  const startPipeline = useCrossModuleStore(state => state.startPipeline);
  const stopPipeline = useCrossModuleStore(state => state.stopPipeline);
  
  // Get predefined templates
  const templates = Object.entries(PREDEFINED_PIPELINES);
  
  // Poll for execution state updates
  useEffect(() => {
    if (executingPipelines.size === 0) return;
    
    const interval = setInterval(() => {
      const stillExecuting = new Set<string>();
      executingPipelines.forEach(pipelineId => {
        const state = getExecutionState(pipelineId);
        if (state && state.status === 'running') {
          stillExecuting.add(pipelineId);
        }
      });
      
      if (stillExecuting.size !== executingPipelines.size) {
        setExecutingPipelines(stillExecuting);
      }
    }, 500);
    
    return () => clearInterval(interval);
  }, [executingPipelines]);
  
  const handleStartPipeline = (templateId: string) => {
    if (allowStart) {
      // Start the pipeline in the store
      startPipeline(templateId);
      setActiveTab('active');
      
      // Get the newly created pipeline and start execution
      setTimeout(() => {
        const pipelines = useCrossModuleStore.getState().activePipelines;
        const newPipeline = pipelines[pipelines.length - 1];
        if (newPipeline) {
          try {
            startPipelineExecution(newPipeline.id);
            setExecutingPipelines(prev => new Set(Array.from(prev).concat([newPipeline.id])));
          } catch (error) {
            console.error('Failed to start pipeline execution:', error);
          }
        }
      }, 100);
    }
  };
  
  const handleStopPipeline = (pipelineId: string) => {
    if (allowStop) {
      stopPipeline(pipelineId);
    }
  };
  
  return (
    <div className={`bg-slate-800/50 rounded-lg border border-slate-700 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <Workflow className="w-4 h-4 text-green-400" />
          <h3 className="text-sm font-medium text-white">{title}</h3>
          {activePipelines.length > 0 && (
            <Badge className="bg-green-500/20 text-green-400 border-0 text-xs">
              {activePipelines.length} active
            </Badge>
          )}
        </div>
        
        {/* Tabs */}
        {showTemplates && (
          <div className="flex items-center gap-1 bg-slate-900/50 rounded-lg p-0.5">
            <button
              onClick={() => setActiveTab('active')}
              className={`px-3 py-1 text-xs rounded transition-colors ${
                activeTab === 'active' 
                  ? 'bg-slate-700 text-white' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setActiveTab('templates')}
              className={`px-3 py-1 text-xs rounded transition-colors ${
                activeTab === 'templates' 
                  ? 'bg-slate-700 text-white' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Templates
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-3 py-1 text-xs rounded transition-colors ${
                activeTab === 'history' 
                  ? 'bg-slate-700 text-white' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              History {pipelineHistory.length > 0 && <span className="ml-1 opacity-60">({pipelineHistory.length})</span>}
            </button>
          </div>
        )}
      </div>
      
      {/* Content */}
      <div className="p-4 overflow-y-auto max-h-96">
        {activeTab === 'active' ? (
          // Active pipelines
          activePipelines.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-slate-500">
              <Workflow className="w-8 h-8 mb-2 opacity-50" />
              <p className="text-sm">No active pipelines</p>
              <p className="text-xs mt-1">Start a pipeline from the Templates tab</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activePipelines.map(pipeline => (
                <ActivePipelineCard
                  key={pipeline.id}
                  pipeline={pipeline}
                  onStop={allowStop ? handleStopPipeline : undefined}
                />
              ))}
            </div>
          )
        ) : activeTab === 'history' ? (
          // Pipeline history
          pipelineHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-slate-500">
              <Archive className="w-8 h-8 mb-2 opacity-50" />
              <p className="text-sm">No pipeline history</p>
              <p className="text-xs mt-1">Completed pipelines will appear here</p>
            </div>
          ) : (
            <div className="space-y-2">
              {pipelineHistory.map(pipeline => (
                <div
                  key={pipeline.id}
                  className="flex items-center gap-3 px-3 py-2 bg-slate-900/30 rounded-lg border border-slate-700/50"
                >
                  <div className="p-1.5 rounded bg-green-500/20">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-white truncate">{pipeline.name}</h4>
                    <p className="text-xs text-slate-500">
                      {pipeline.steps.length} steps • Completed {new Date(pipeline.updatedAt).toLocaleString()}
                    </p>
                  </div>
                  <Badge className="bg-green-500/10 text-green-400 border-0 text-xs">
                    Completed
                  </Badge>
                </div>
              ))}
            </div>
          )
        ) : (
          // Pipeline templates
          templates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-slate-500">
              <Settings className="w-8 h-8 mb-2 opacity-50" />
              <p className="text-sm">No pipeline templates defined</p>
            </div>
          ) : (
            <div className="space-y-3">
              {templates.map(([id, template]) => (
                <PipelineTemplateCard
                  key={id}
                  templateId={id}
                  template={template}
                  onStart={allowStart ? handleStartPipeline : undefined}
                />
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}

export default PipelineOrchestratorPanel;
