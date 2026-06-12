

/**
 * Live Pipeline Spotlight
 * 
 * Hero component for prominent display of active pipeline execution.
 * Designed for investor demos - dramatic visual emphasis on data flow.
 * 
 * @module components/cross-module/LivePipelineSpotlight
 * @version 0.27.75
 */

import { useState, useEffect, useMemo } from 'react';
import {
  Workflow, Play, CheckCircle2, Clock, ArrowRight, Zap, Sparkles,
  AlertTriangle, Loader2, Radio, ChevronRight, Rocket, Timer,
  FileText, Shield, Activity, Beaker, BookOpen, Send, FolderOpen,
  Database, Package, FlaskConical, Microscope, Layers, Building2,
  BarChart3, Archive, ClipboardList,
  ClipboardCheck,
  Link,
} from 'lucide-react';
import {
  useCrossModuleStore,
  type ModuleType,
  type DataFlowPipeline,
  PREDEFINED_PIPELINES,
} from '@/store/useCrossModuleStore';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  startPipelineExecution,
  getExecutionState,
  type PipelineExecutionState,
} from '@/lib/pipeline-execution';

// =============================================================================
// STEP NARRATIVES - Human-readable descriptions of what each step does
// =============================================================================

const STEP_NARRATIVES: Record<string, Record<string, string>> = {
  'lslv-to-submission': {
    'step-1': 'Locking clinical database — all patient data finalized for analysis',
    'step-2': 'AI generating Clinical Study Report from locked datasets',
    'step-3': 'Auto-filing trial documents to Trial Master File for compliance',
    'step-4': 'Compiling eCTD submission package for regulatory gateway',
  },
  'signal-to-label': {
    'step-1': 'Assessing safety signal severity and label impact',
    'step-2': 'Updating Pharmacovigilance System Master File with new signal',
    'step-3': 'Preparing label variation submission for health authorities',
  },
  'lab-to-m4': {
    'step-1': 'Linking lab notebook experiments to GLP study record',
    'step-2': 'Finalizing GLP study report with regulatory formatting',
    'step-3': 'Packaging nonclinical data for Module 4 submission',
  },
  'haq-to-submission': {
    'step-1': 'Finalizing Health Authority Question response',
    'step-2': 'Quality control review against submission standards',
    'step-3': 'Archiving response package to Trial Master File',
    'step-4': 'Submitting response through regulatory gateway',
  },
  'deviation-to-capa': {
    'step-1': 'Logging quality deviation in QMS with root cause',
    'step-2': 'Assessing regulatory impact and notification requirements',
    'step-3': 'Updating TMF with deviation documentation',
  },
  'cmc-change-flow': {
    'step-1': 'Documenting CMC change with technical assessment',
    'step-2': 'Updating IDMP substance/product records',
    'step-3': 'Preparing variation submission for affected markets',
  },
  'study-setup': {
    'step-1': 'Importing site intelligence data to CTMS',
    'step-2': 'Creating TMF folder structure for new study',
    'step-3': 'Configuring safety database for study-specific AE coding',
    'step-4': 'Setting up EDC forms and edit checks',
  },
};

// Default narrative for unknown steps
const getStepNarrative = (pipelineId: string, stepId: string, stepName: string): string => {
  const pipelineNarratives = STEP_NARRATIVES[pipelineId];
  if (pipelineNarratives && pipelineNarratives[stepId]) {
    return pipelineNarratives[stepId];
  }
  return `Processing ${stepName.toLowerCase()}...`;
};

// =============================================================================
// MODULE ICONS & COLORS (same as PipelineOrchestratorPanel)
// =============================================================================

const MODULE_METADATA: Record<ModuleType, { icon: React.ComponentType<{ className?: string }>; color: string; bgColor: string; label: string }> = {
  authoring: { icon: BookOpen, color: 'text-indigo-400', bgColor: 'bg-indigo-500/20', label: 'Authoring' },
  haq: { icon: FileText, color: 'text-amber-400', bgColor: 'bg-amber-500/20', label: 'HAQ' },
  submissions: { icon: Send, color: 'text-green-400', bgColor: 'bg-green-500/20', label: 'Submissions' },
  regulatory: { icon: FileText, color: 'text-cyan-400', bgColor: 'bg-cyan-500/20', label: 'Regulatory' },
  labeling: { icon: Package, color: 'text-teal-400', bgColor: 'bg-teal-500/20', label: 'Labeling' },
  ctms: { icon: Activity, color: 'text-blue-400', bgColor: 'bg-blue-500/20', label: 'CTMS' },
  tmf: { icon: FolderOpen, color: 'text-violet-400', bgColor: 'bg-violet-500/20', label: 'TMF' },
  edc: { icon: Database, color: 'text-sky-400', bgColor: 'bg-sky-500/20', label: 'EDC' },
  safety: { icon: Shield, color: 'text-red-400', bgColor: 'bg-red-500/20', label: 'Safety' },
  quality: { icon: CheckCircle2, color: 'text-orange-400', bgColor: 'bg-orange-500/20', label: 'QMS' },
  psmf: { icon: ClipboardList, color: 'text-rose-400', bgColor: 'bg-rose-500/20', label: 'PSMF' },
  eln: { icon: Microscope, color: 'text-purple-400', bgColor: 'bg-purple-500/20', label: 'ELN' },
  glp: { icon: FlaskConical, color: 'text-emerald-400', bgColor: 'bg-emerald-500/20', label: 'GLP' },
  'sample-management': { icon: Beaker, color: 'text-pink-400', bgColor: 'bg-pink-500/20', label: 'Samples' },
  idmp: { icon: Layers, color: 'text-lime-400', bgColor: 'bg-lime-500/20', label: 'IDMP' },
  'master-data': { icon: Building2, color: 'text-slate-400', bgColor: 'bg-slate-500/20', label: 'MDM' },
  'study-intel': { icon: BarChart3, color: 'text-fuchsia-400', bgColor: 'bg-fuchsia-500/20', label: 'Intel' },
  archives: { icon: Archive, color: 'text-stone-400', bgColor: 'bg-stone-500/20', label: 'Archives' },
  'document-control': { icon: FileText, color: 'text-slate-400', bgColor: 'bg-slate-500/20', label: 'Document Control' },
  qms: { icon: Shield, color: 'text-emerald-400', bgColor: 'bg-emerald-500/20', label: 'QMS' },
  audit: { icon: ClipboardCheck, color: 'text-teal-400', bgColor: 'bg-teal-500/20', label: 'Audit' },
  executive: { icon: BarChart3, color: 'text-violet-400', bgColor: 'bg-violet-500/20', label: 'Executive' },
};

// Pipeline metadata for quick-start buttons
const QUICK_START_PIPELINES = [
  { id: 'signal-to-label', name: 'Safety Signal', icon: Shield, color: 'red' },
  { id: 'lslv-to-submission', name: 'LSLV→Submit', icon: Send, color: 'green' },
  { id: 'haq-to-submission', name: 'HAQ Response', icon: FileText, color: 'amber' },
];

// =============================================================================
// SPOTLIGHT STEP COMPONENT
// =============================================================================

interface SpotlightStepProps {
  step: DataFlowPipeline['steps'][0];
  status: 'pending' | 'active' | 'completed' | 'failed';
  stepNumber: number;
  totalSteps: number;
  pipelineId: string;
  elapsedMs?: number;
}

function SpotlightStep({ step, status, stepNumber, totalSteps, pipelineId, elapsedMs }: SpotlightStepProps) {
  const source = MODULE_METADATA[step.sourceModule];
  const target = MODULE_METADATA[step.targetModule];
  const SourceIcon = source.icon;
  const TargetIcon = target.icon;
  const narrative = getStepNarrative(pipelineId, step.id, step.name);
  
  const isActive = status === 'active';
  const isCompleted = status === 'completed';
  
  return (
    <div className={`relative flex items-center gap-3 p-3 rounded-xl transition-all duration-500 ${
      isActive 
        ? 'bg-gradient-to-r from-blue-500/20 via-purple-500/10 to-transparent border border-blue-500/40 shadow-lg shadow-blue-500/20' 
        : isCompleted
        ? 'bg-green-500/10 border border-green-500/30'
        : 'bg-slate-800/30 border border-slate-700/50'
    }`}>
      {/* Step number badge */}
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
        isActive 
          ? 'bg-blue-500 text-white animate-pulse' 
          : isCompleted
          ? 'bg-green-500 text-white'
          : 'bg-slate-700 text-slate-400'
      }`}>
        {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : stepNumber}
      </div>
      
      {/* Step content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={`text-sm font-semibold ${isActive ? 'text-blue-400' : isCompleted ? 'text-green-400' : 'text-slate-300'}`}>
            {step.name}
          </span>
          {isActive && (
            <Badge className="bg-blue-500/30 text-blue-300 border-0 text-[10px] animate-pulse">
              <Radio className="w-2.5 h-2.5 mr-1" />
              ACTIVE
            </Badge>
          )}
          {isCompleted && (
            <Badge className="bg-green-500/30 text-green-300 border-0 text-[10px]">
              <Zap className="w-2.5 h-2.5 mr-1" />
              DONE
            </Badge>
          )}
        </div>
        
        {/* Narrative description */}
        <p className={`text-xs ${isActive ? 'text-blue-200' : 'text-slate-400'}`}>
          {narrative}
        </p>
        
        {/* Module flow */}
        <div className="flex items-center gap-2 mt-2">
          <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg ${source.bgColor}`}>
            <SourceIcon className={`w-3 h-3 ${source?.color ?? ''}`} />
            <span className="text-xs text-slate-300">{source.label}</span>
          </div>
          
          <div className="relative flex items-center">
            <div className={`w-6 h-0.5 ${isCompleted ? 'bg-green-500' : isActive ? 'bg-blue-500' : 'bg-slate-600'}`} />
            {isActive && (
              <div className="absolute inset-0 overflow-hidden">
                <div className="w-2 h-0.5 bg-white rounded animate-[slideRight_0.6s_ease-in-out_infinite]" />
              </div>
            )}
            <ArrowRight className={`w-3 h-3 ${isCompleted ? 'text-green-400' : isActive ? 'text-blue-400' : 'text-slate-600'}`} />
          </div>
          
          <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg ${target.bgColor}`}>
            <TargetIcon className={`w-3 h-3 ${target?.color ?? ''}`} />
            <span className="text-xs text-slate-300">{target.label}</span>
          </div>
        </div>
      </div>
      
      {/* Elapsed time for active step */}
      {isActive && elapsedMs !== undefined && (
        <div className="flex flex-col items-end text-right flex-shrink-0">
          <div className="flex items-center gap-1 text-blue-400">
            <Timer className="w-3 h-3" />
            <span className="text-xs font-mono">{(elapsedMs / 1000).toFixed(1)}s</span>
          </div>
          <Loader2 className="w-4 h-4 text-blue-400 animate-spin mt-1" />
        </div>
      )}
      
      {/* Completion time for completed step */}
      {isCompleted && elapsedMs !== undefined && (
        <div className="flex items-center gap-1 text-green-400 flex-shrink-0">
          <CheckCircle2 className="w-3 h-3" />
          <span className="text-xs font-mono">{(elapsedMs / 1000).toFixed(1)}s</span>
        </div>
      )}
      
      {/* Active step glow effect */}
      {isActive && (
        <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/10 to-purple-500/10 animate-pulse pointer-events-none" />
      )}
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

interface LivePipelineSpotlightProps {
  className?: string;
}

export function LivePipelineSpotlight({ className = '' }: LivePipelineSpotlightProps) {
  const [executingPipelineId, setExecutingPipelineId] = useState<string | null>(null);
  const [executionState, setExecutionState] = useState<PipelineExecutionState | undefined>();
  const [totalElapsedMs, setTotalElapsedMs] = useState(0);
  const [stepElapsedMs, setStepElapsedMs] = useState<Record<string, number>>({});
  
  // Get active pipelines from store
  const activePipelines = useCrossModuleStore(state => state.getActivePipelines());
  const startPipeline = useCrossModuleStore(state => state.startPipeline);
  
  // Find the currently running pipeline
  const runningPipeline = useMemo(() => {
    return activePipelines.find(p => {
      const state = getExecutionState(p.id);
      return state?.status === 'running';
    }) || activePipelines[0];
  }, [activePipelines]);
  
  // Poll for execution state
  useEffect(() => {
    if (!runningPipeline) {
      setExecutionState(undefined);
      return;
    }
    
    const updateState = () => {
      const state = getExecutionState(runningPipeline.id);
      setExecutionState(state);
      
      // Calculate total elapsed time
      if (state?.startedAt) {
        const endTime = state.completedAt ? new Date(state.completedAt).getTime() : Date.now();
        setTotalElapsedMs(endTime - new Date(state.startedAt).getTime());
      }
      
      // Calculate per-step elapsed times
      if (state?.stepResults) {
        const newStepElapsed: Record<string, number> = {};
        Object.values(state.stepResults).forEach(result => {
          if (result.startedAt) {
            const endTime = result.completedAt ? new Date(result.completedAt).getTime() : Date.now();
            newStepElapsed[result.stepId] = endTime - new Date(result.startedAt).getTime();
          }
        });
        setStepElapsedMs(newStepElapsed);
      }
    };
    
    updateState();
    const interval = setInterval(updateState, 100);
    return () => clearInterval(interval);
  }, [runningPipeline]);
  
  // Get step status
  const getStepStatus = (stepId: string): 'pending' | 'active' | 'completed' | 'failed' => {
    if (!executionState) return 'pending';
    const result = executionState.stepResults[stepId];
    if (!result) return 'pending';
    if (result.status === 'completed' || result.status === 'skipped') return 'completed';
    if (result.status === 'running') return 'active';
    if (result.status === 'failed') return 'failed';
    return 'pending';
  };
  
  // Handle quick-start pipeline
  const handleQuickStart = (templateId: string) => {
    startPipeline(templateId);
    
    // Start execution after brief delay
    setTimeout(() => {
      const pipelines = useCrossModuleStore.getState().activePipelines;
      const newPipeline = pipelines[pipelines.length - 1];
      if (newPipeline) {
        try {
          startPipelineExecution(newPipeline.id);
          setExecutingPipelineId(newPipeline.id);
        } catch (error) {
          console.error('Failed to start pipeline:', error);
        }
      }
    }, 100);
  };
  
  // Calculate progress
  const completedSteps = executionState 
    ? Object.values(executionState.stepResults).filter(r => r.status === 'completed' || r.status === 'skipped').length
    : 0;
  const totalSteps = runningPipeline?.steps.length || 0;
  const progress = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
  const isRunning = executionState?.status === 'running';
  const isCompleted = executionState?.status === 'completed';
  
  // Get template ID from pipeline name
  const getTemplateId = (name: string): string => {
    const templateEntry = Object.entries(PREDEFINED_PIPELINES).find(
      ([, template]) => template.name === name
    );
    return templateEntry ? templateEntry[0] : 'unknown';
  };
  
  return (
    <div className={`bg-gradient-to-br from-slate-800/80 via-slate-800/60 to-slate-900/80 rounded-xl border border-slate-700/50 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-700/50 bg-slate-800/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isRunning ? 'bg-blue-500/20' : isCompleted ? 'bg-green-500/20' : 'bg-slate-700/50'}`}>
              {isRunning ? (
                <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
              ) : isCompleted ? (
                <CheckCircle2 className="w-5 h-5 text-green-400" />
              ) : (
                <Workflow className="w-5 h-5 text-slate-400" />
              )}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                Live Pipeline Execution
                {isRunning && (
                  <Badge className="bg-blue-500/20 text-blue-400 border-0 text-[10px]">
                    <span className="inline-block w-1.5 h-1.5 bg-blue-400 rounded-full mr-1 animate-ping" />
                    LIVE
                  </Badge>
                )}
              </h3>
              <p className="text-xs text-slate-400">
                {runningPipeline 
                  ? `${runningPipeline.name} • ${totalSteps} steps`
                  : 'Start a pipeline to see real-time data flow'
                }
              </p>
            </div>
          </div>
          
          {/* Progress & Timer */}
          {runningPipeline && (
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className={`text-lg font-mono font-bold ${isCompleted ? 'text-green-400' : 'text-blue-400'}`}>
                  {(totalElapsedMs / 1000).toFixed(1)}s
                </div>
                <div className="text-xs text-slate-500">elapsed</div>
              </div>
              <div className="w-24">
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${isCompleted ? 'bg-green-500' : 'bg-blue-500'}`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                  <span>{completedSteps}/{totalSteps}</span>
                  <span>{progress}%</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Content */}
      {runningPipeline ? (
        <div className="p-4 space-y-2">
          {runningPipeline.steps.map((step, index) => (
            <SpotlightStep
              key={step.id}
              step={step}
              status={getStepStatus(step.id)}
              stepNumber={index + 1}
              totalSteps={totalSteps}
              pipelineId={getTemplateId(runningPipeline.name)}
              elapsedMs={stepElapsedMs[step.id]}
            />
          ))}
          
          {/* Completion celebration */}
          {isCompleted && (
            <div className="mt-4 p-4 bg-gradient-to-r from-green-500/20 to-emerald-500/10 border border-green-500/30 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/30 rounded-lg">
                  <Sparkles className="w-5 h-5 text-green-400" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-green-400">Pipeline Complete!</div>
                  <div className="text-xs text-green-300/70">
                    {totalSteps} steps executed in {(totalElapsedMs / 1000).toFixed(1)} seconds
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-green-400">{(totalElapsedMs / 1000).toFixed(1)}s</div>
                  <div className="text-[10px] text-green-300/50">vs 4-6 weeks legacy</div>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Empty state with quick-start */
        <div className="p-6">
          <div className="text-center mb-6">
            <div className="w-12 h-12 bg-slate-700/50 rounded-xl flex items-center justify-center mx-auto mb-3">
              <Rocket className="w-6 h-6 text-slate-500" />
            </div>
            <h4 className="text-sm font-medium text-slate-300 mb-1">No Active Pipelines</h4>
            <p className="text-xs text-slate-500">Start a demo pipeline to see R&D Connected in action</p>
          </div>
          
          <div className="grid grid-cols-3 gap-3">
            {QUICK_START_PIPELINES.map(pipeline => {
              const IconComponent = pipeline.icon;
              return (
                <button
                  key={pipeline.id}
                  onClick={() => handleQuickStart(pipeline.id)}
                  className={`p-3 rounded-lg border border-slate-700 hover:border-${pipeline?.color ?? ''}-500/50 bg-slate-800/50 hover:bg-slate-800 transition-all group`}
                >
                  <div className={`w-8 h-8 rounded-lg bg-${pipeline?.color ?? ''}-500/20 flex items-center justify-center mb-2 mx-auto group-hover:scale-110 transition-transform`}>
                    <IconComponent className={`w-4 h-4 text-${pipeline?.color ?? ''}-400`} />
                  </div>
                  <div className="text-xs font-medium text-slate-300">{pipeline.name}</div>
                  <div className="flex items-center justify-center gap-1 mt-1 text-[10px] text-slate-500 group-hover:text-blue-400 transition-colors">
                    <Play className="w-2.5 h-2.5" />
                    Start
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
      
      {/* Footer with demo context */}
      <div className="px-5 py-3 border-t border-slate-700/50 bg-slate-900/50">
        <div className="flex items-center justify-between text-[10px] text-slate-500">
          <div className="flex items-center gap-4">
            <span>Data flows automatically across modules</span>
            <span>•</span>
            <span>Zero manual handoffs</span>
          </div>
          <div className="flex items-center gap-1 text-accent-purple">
            <Zap className="w-3 h-3" />
            <span>R&D Connected</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LivePipelineSpotlight;
