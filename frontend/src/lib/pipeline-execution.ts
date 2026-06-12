

/**
 * Pipeline Execution Service
 * 
 * Handles automated execution of data flow pipelines, processing
 * steps sequentially and emitting events for each stage.
 * 
 * @module lib/pipeline-execution
 * @version 0.27.64
 * 
 * Demo Polish:
 * - Configurable timing for investor demo pacing (1.5-2s/step)
 * - Variable delays based on step type for natural rhythm
 * - Toast notifications for step completions
 * - Dramatic pacing for "aha moments"
 */

import { useCrossModuleStore } from '@/store/useCrossModuleStore';
import { useToastStore } from '@/components/ui/Toast';
import type {
  DataFlowPipeline,
  DataFlowStep,
  ModuleType,
} from '@/domains/cross-module/contracts';

// Types for pipeline execution
export interface PipelineExecutionState {
  pipelineId: string;
  currentStepIndex: number;
  status: 'running' | 'paused' | 'completed' | 'failed';
  stepResults: Record<string, StepResult>;
  startedAt: string;
  completedAt?: string;
  error?: string;
}

export interface StepResult {
  stepId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  startedAt?: string;
  completedAt?: string;
  outputData?: Record<string, unknown>;
  error?: string;
}

// =============================================================================
// DEMO TIMING CONFIGURATION
// =============================================================================

export interface DemoTimingConfig {
  /** Base delay per step in milliseconds (default: 1800ms for demo) */
  baseStepDelay: number;
  /** Delay between steps in milliseconds */
  interStepDelay: number;
  /** Additional delay for AI-powered steps */
  aiStepBonus: number;
  /** Additional delay for cross-module handoffs */
  crossModuleBonus: number;
  /** Dramatic pause for key "aha moment" steps */
  ahaStepDelay: number;
  /** Whether to show toast notifications */
  showToasts: boolean;
}

// Default timing optimized for investor demos (roadmap spec: 1.5-2s/step)
const DEFAULT_DEMO_TIMING: DemoTimingConfig = {
  baseStepDelay: 1800,      // 1.8s base - visible but not tedious
  interStepDelay: 400,      // 400ms between steps - rhythm
  aiStepBonus: 600,         // +600ms for AI steps - "it's thinking"
  crossModuleBonus: 300,    // +300ms for cross-module - shows data flow
  ahaStepDelay: 2500,       // 2.5s for key moments - dramatic effect
  showToasts: true,
};

// Faster timing for development/testing
const FAST_TIMING: DemoTimingConfig = {
  baseStepDelay: 500,
  interStepDelay: 100,
  aiStepBonus: 200,
  crossModuleBonus: 100,
  ahaStepDelay: 800,
  showToasts: false,
};

// Current active timing config
let currentTiming: DemoTimingConfig = DEFAULT_DEMO_TIMING;

/**
 * Set the timing configuration
 */
export function setDemoTiming(config: Partial<DemoTimingConfig> | 'demo' | 'fast'): void {
  if (config === 'demo') {
    currentTiming = DEFAULT_DEMO_TIMING;
  } else if (config === 'fast') {
    currentTiming = FAST_TIMING;
  } else {
    currentTiming = { ...currentTiming, ...config };
  }
}

/**
 * Get current timing configuration
 */
export function getDemoTiming(): DemoTimingConfig {
  return { ...currentTiming };
}

// Steps that should have dramatic "aha moment" timing
const AHA_STEP_PATTERNS = [
  'ai-generation',
  'auto-classification',
  'signal-detection',
  'submission-ready',
  'compliance-check',
  'tmf-auto-file',
];

// Steps with AI involvement
const AI_STEP_PATTERNS = [
  'ai-',
  'auto-',
  'ml-',
  'smart-',
  'predict',
  'generate',
  'analysis',
];

// Track active executions
const activeExecutions = new Map<string, PipelineExecutionState>();

// =============================================================================
// STEP TIMING CALCULATION
// =============================================================================

/**
 * Calculate the appropriate delay for a step based on its characteristics
 */
function calculateStepDelay(step: DataFlowStep, isLastStep: boolean): number {
  const stepName = step.name.toLowerCase();
  const handoffType = step.handoffType.toLowerCase();
  
  let delay = currentTiming.baseStepDelay;
  
  // Check if this is an "aha moment" step
  if (AHA_STEP_PATTERNS.some(pattern => stepName.includes(pattern) || handoffType.includes(pattern))) {
    return currentTiming.ahaStepDelay;
  }
  
  // Add AI bonus
  if (AI_STEP_PATTERNS.some(pattern => stepName.includes(pattern) || handoffType.includes(pattern))) {
    delay += currentTiming.aiStepBonus;
  }
  
  // Add cross-module bonus for different source/target modules
  if (step.sourceModule !== step.targetModule) {
    delay += currentTiming.crossModuleBonus;
  }
  
  // Slightly faster on last step - satisfying completion
  if (isLastStep) {
    delay = Math.round(delay * 0.8);
  }
  
  return delay;
}

// =============================================================================
// EXECUTION LOGIC
// =============================================================================

/**
 * Start executing a pipeline
 */
export function startPipelineExecution(pipelineId: string): string {
  const store = useCrossModuleStore.getState();
  const pipeline = store.activePipelines.find(p => p.id === pipelineId);
  
  if (!pipeline) {
    throw new Error(`Pipeline ${pipelineId} not found`);
  }
  
  // Initialize execution state
  const executionState: PipelineExecutionState = {
    pipelineId,
    currentStepIndex: 0,
    status: 'running',
    stepResults: {},
    startedAt: new Date().toISOString(),
  };
  
  // Initialize step results
  pipeline.steps.forEach((step, index) => {
    executionState.stepResults[step.id] = {
      stepId: step.id,
      status: index === 0 ? 'running' : 'pending',
    };
  });
  
  activeExecutions.set(pipelineId, executionState);
  
  // Start executing steps asynchronously
  executeNextStep(pipelineId, pipeline);
  
  return pipelineId;
}

/**
 * Execute the next step in the pipeline
 */
async function executeNextStep(pipelineId: string, pipeline: DataFlowPipeline): Promise<void> {
  const execution = activeExecutions.get(pipelineId);
  if (!execution || execution.status !== 'running') return;
  
  const currentStep = pipeline.steps[execution.currentStepIndex];
  if (!currentStep) {
    // All steps completed
    completePipeline(pipelineId, pipeline);
    return;
  }
  
  const store = useCrossModuleStore.getState();
  const isLastStep = execution.currentStepIndex === pipeline.steps.length - 1;
  
  // Mark step as running
  execution.stepResults[currentStep.id] = {
    stepId: currentStep.id,
    status: 'running',
    startedAt: new Date().toISOString(),
  };
  
  // Emit step started event
  store.emitEvent({
    eventType: 'workflow-step-completed',
    sourceModule: currentStep.sourceModule,
    targetModules: [currentStep.targetModule],
    entityType: 'pipeline-step',
    entityId: currentStep.id,
    description: `Step ${execution.currentStepIndex + 1}/${pipeline.steps.length}: ${currentStep.name}`,
    payload: {
      pipelineId,
      stepIndex: execution.currentStepIndex,
      stepName: currentStep.name,
      sourceModule: currentStep.sourceModule,
      targetModule: currentStep.targetModule,
      totalSteps: pipeline.steps.length,
    },
  });
  
  // Calculate appropriate delay for this step
  const stepDelay = calculateStepDelay(currentStep, isLastStep);
  
  // Simulate step execution with calculated timing
  await simulateStepExecution(currentStep, stepDelay);
  
  // Check if step should be skipped based on conditions
  const shouldSkip = currentStep.conditions?.some(c => !evaluateCondition(c, execution.stepResults));
  
  if (shouldSkip) {
    execution.stepResults[currentStep.id].status = 'skipped';
  } else {
    // Mark step as completed
    execution.stepResults[currentStep.id] = {
      ...execution.stepResults[currentStep.id],
      status: 'completed',
      completedAt: new Date().toISOString(),
      outputData: generateMockOutput(currentStep),
    };
    
    // Emit toast notification if enabled
    if (currentTiming.showToasts) {
      emitStepToast(currentStep, execution.currentStepIndex + 1, pipeline.steps.length);
    }
  }
  
  // Move to next step
  execution.currentStepIndex++;
  
  // Continue with next step after inter-step delay
  setTimeout(() => {
    executeNextStep(pipelineId, pipeline);
  }, currentTiming.interStepDelay);
}

/**
 * Complete the pipeline execution
 */
function completePipeline(pipelineId: string, pipeline: DataFlowPipeline): void {
  const execution = activeExecutions.get(pipelineId);
  if (!execution) return;
  
  execution.status = 'completed';
  execution.completedAt = new Date().toISOString();
  
  const store = useCrossModuleStore.getState();
  const durationMs = calculateDuration(execution.startedAt, execution.completedAt!);
  
  // Move pipeline to history with completion stats (emits event internally)
  store.completePipeline(pipelineId, durationMs);
}

/**
 * Simulate step execution with calculated delay
 */
async function simulateStepExecution(step: DataFlowStep, delayMs: number): Promise<void> {
  return new Promise(resolve => {
    setTimeout(resolve, delayMs);
  });
}

/**
 * Emit a toast notification for step completion
 */
function emitStepToast(step: DataFlowStep, stepNumber: number, totalSteps: number): void {
  const toastStore = useToastStore.getState();
  
  // Map ModuleType to ToastModule
  const moduleMap: Record<string, 'safety' | 'haq' | 'tmf' | 'ctms' | 'authoring' | 'submissions' | 'documents' | 'qms' | 'labeling' | 'pipeline' | 'ai' | 'system'> = {
    safety: 'safety',
    haq: 'haq',
    tmf: 'tmf',
    ctms: 'ctms',
    authoring: 'authoring',
    submissions: 'submissions',
    regulatory: 'documents',
    labeling: 'labeling',
    quality: 'qms',
    psmf: 'qms',
    edc: 'ctms',
    eln: 'system',
    glp: 'system',
    'sample-management': 'system',
    idmp: 'documents',
    'master-data': 'system',
    'study-intel': 'ctms',
    archives: 'tmf',
  };
  
  const sourceModule = moduleMap[step.sourceModule] || 'system';
  const targetModule = moduleMap[step.targetModule] || 'system';
  
  // Create a concise step message
  const message = `${step.name} (${stepNumber}/${totalSteps})`;
  
  toastStore.addToast({
    type: 'cross-module',
    message,
    sourceModule,
    targetModule,
    duration: 3000,
  });
}

/**
 * Evaluate a condition (mock implementation)
 */
function evaluateCondition(condition: { field: string; operator: string; value: unknown }, stepResults: Record<string, StepResult>): boolean {
  // In production, this would evaluate actual conditions
  // For demo, always return true
  return true;
}

/**
 * Generate mock output data for a step
 */
function generateMockOutput(step: DataFlowStep): Record<string, unknown> {
  const baseOutput = {
    processedAt: new Date().toISOString(),
    sourceModule: step.sourceModule,
    targetModule: step.targetModule,
    recordsProcessed: Math.floor(Math.random() * 100) + 10,
    status: 'success',
  };
  
  // Add step-specific mock data based on handoff type
  const handoffType = step.handoffType;
  if (handoffType.includes('safety')) {
    return { ...baseOutput, signalsProcessed: Math.floor(Math.random() * 5) + 1 };
  }
  if (handoffType.includes('document')) {
    return { ...baseOutput, documentsGenerated: Math.floor(Math.random() * 3) + 1 };
  }
  if (handoffType.includes('submission')) {
    return { ...baseOutput, complianceScore: 95 + Math.floor(Math.random() * 5) };
  }
  
  return baseOutput;
}

/**
 * Calculate duration in milliseconds
 */
function calculateDuration(start: string, end: string): number {
  return new Date(end).getTime() - new Date(start).getTime();
}

/**
 * Format duration in human-readable format
 */
export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ${seconds % 60}s`;
}

/**
 * Get execution state for a pipeline
 */
export function getExecutionState(pipelineId: string): PipelineExecutionState | undefined {
  return activeExecutions.get(pipelineId);
}

/**
 * Pause pipeline execution
 */
export function pausePipeline(pipelineId: string): void {
  const execution = activeExecutions.get(pipelineId);
  if (execution && execution.status === 'running') {
    execution.status = 'paused';
  }
}

/**
 * Resume pipeline execution
 */
export function resumePipeline(pipelineId: string): void {
  const execution = activeExecutions.get(pipelineId);
  const store = useCrossModuleStore.getState();
  const pipeline = store.activePipelines.find(p => p.id === pipelineId);
  
  if (execution && execution.status === 'paused' && pipeline) {
    execution.status = 'running';
    executeNextStep(pipelineId, pipeline);
  }
}

/**
 * Hook to start and monitor pipeline execution
 */
export function usePipelineExecution() {
  const startPipeline = useCrossModuleStore(s => s.startPipeline);
  
  const executeAndMonitor = (templateId: string) => {
    // First create the pipeline instance
    startPipeline(templateId);
    
    // Get the newly created pipeline
    const pipelines = useCrossModuleStore.getState().activePipelines;
    const newPipeline = pipelines[pipelines.length - 1];
    
    if (newPipeline) {
      // Start execution
      startPipelineExecution(newPipeline.id);
    }
  };
  
  return {
    execute: executeAndMonitor,
    getState: getExecutionState,
    pause: pausePipeline,
    resume: resumePipeline,
    setTiming: setDemoTiming,
    getTiming: getDemoTiming,
  };
}
