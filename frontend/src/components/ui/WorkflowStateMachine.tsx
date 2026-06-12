

/**
 * WorkflowStateMachine - v130
 * 
 * Comprehensive workflow state machine system for:
 * - HAQ Response workflows (Draft → Review → Submit)
 * - Document workflows (Draft → Review → Approve → Publish)
 * - Submission workflows (Assembly → Validation → Gateway → Submit)
 * 
 * Features:
 * - Type-safe state transitions
 * - Transition validation with guards
 * - Side effect actions on enter/exit
 * - Visual state diagram rendering
 * - History tracking for audit
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  ArrowRight,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Play,
  Pause,
  RotateCcw,
  ChevronRight,
  FileText,
  Send,
  Eye,
  Edit3,
  Lock,
  Unlock,
  History,
  GitBranch,
  Zap,
} from 'lucide-react';
import { Button } from './Button';
import { Badge, BadgeColor } from './Badge';
import { Card, CardHeader, CardContent } from './Card';

// ============================================================================
// TYPES
// ============================================================================

export type WorkflowType = 'haq-response' | 'document' | 'submission' | 'custom';

export interface WorkflowState {
  id: string;
  name: string;
  description?: string;
  type: 'initial' | 'intermediate' | 'final' | 'error';
  color?: BadgeColor;
  icon?: React.ReactNode;
  /** Actions to run on entering this state */
  onEnter?: () => void | Promise<void>;
  /** Actions to run on exiting this state */
  onExit?: () => void | Promise<void>;
  /** Metadata for the state */
  meta?: Record<string, unknown>;
}

export interface WorkflowTransition {
  id: string;
  from: string;
  to: string;
  event: string;
  label?: string;
  description?: string;
  /** Guard function - returns true if transition is allowed */
  guard?: (context: WorkflowContext) => boolean | Promise<boolean>;
  /** Reason why guard failed (for UI feedback) */
  guardFailureReason?: string;
  /** Actions to run during transition */
  action?: (context: WorkflowContext) => void | Promise<void>;
  /** Required permissions/roles */
  requiredRoles?: string[];
  /** Is this an automated transition? */
  automated?: boolean;
}

export interface WorkflowContext {
  entityId: string;
  entityType: string;
  currentState: string;
  previousStates: string[];
  data: Record<string, unknown>;
  userId?: string;
  userRole?: string;
  timestamp: string;
}

export interface WorkflowHistoryEntry {
  id: string;
  fromState: string;
  toState: string;
  event: string;
  timestamp: string;
  userId?: string;
  userName?: string;
  comment?: string;
  duration?: number;
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  description?: string;
  type: WorkflowType;
  version: string;
  states: WorkflowState[];
  transitions: WorkflowTransition[];
  initialState: string;
  finalStates: string[];
  errorStates?: string[];
}

export interface WorkflowInstance {
  id: string;
  definitionId: string;
  entityId: string;
  entityType: string;
  currentState: string;
  context: WorkflowContext;
  history: WorkflowHistoryEntry[];
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  status: 'active' | 'completed' | 'failed' | 'paused';
}

// ============================================================================
// PREDEFINED WORKFLOW DEFINITIONS
// ============================================================================

export const HAQ_RESPONSE_WORKFLOW: WorkflowDefinition = {
  id: 'haq-response-workflow',
  name: 'HAQ Response Workflow',
  description: 'Health Authority Question response lifecycle',
  type: 'haq-response',
  version: '1.0.0',
  states: [
    {
      id: 'draft',
      name: 'Draft',
      description: 'Response is being drafted',
      type: 'initial',
      color: 'slate',
      icon: <Edit3 className="w-4 h-4" />,
    },
    {
      id: 'ai-generating',
      name: 'AI Generating',
      description: 'AI is generating response content',
      type: 'intermediate',
      color: 'purple',
      icon: <Zap className="w-4 h-4" />,
    },
    {
      id: 'sme-review',
      name: 'SME Review',
      description: 'Subject matter expert is reviewing',
      type: 'intermediate',
      color: 'blue',
      icon: <Eye className="w-4 h-4" />,
    },
    {
      id: 'regulatory-review',
      name: 'Regulatory Review',
      description: 'Regulatory affairs is reviewing',
      type: 'intermediate',
      color: 'amber',
      icon: <Eye className="w-4 h-4" />,
    },
    {
      id: 'qa-review',
      name: 'QA Review',
      description: 'Quality assurance review',
      type: 'intermediate',
      color: 'teal',
      icon: <CheckCircle className="w-4 h-4" />,
    },
    {
      id: 'approved',
      name: 'Approved',
      description: 'Response approved for submission',
      type: 'intermediate',
      color: 'green',
      icon: <CheckCircle className="w-4 h-4" />,
    },
    {
      id: 'submitted',
      name: 'Submitted',
      description: 'Response submitted to HA',
      type: 'final',
      color: 'emerald',
      icon: <Send className="w-4 h-4" />,
    },
    {
      id: 'rejected',
      name: 'Rejected',
      description: 'Response rejected, needs rework',
      type: 'error',
      color: 'red',
      icon: <XCircle className="w-4 h-4" />,
    },
  ],
  transitions: [
    {
      id: 't1',
      from: 'draft',
      to: 'ai-generating',
      event: 'REQUEST_AI_GENERATION',
      label: 'Generate with AI',
      description: 'Request AI to generate response content',
    },
    {
      id: 't2',
      from: 'ai-generating',
      to: 'draft',
      event: 'AI_GENERATION_COMPLETE',
      label: 'Generation Complete',
      automated: true,
    },
    {
      id: 't3',
      from: 'draft',
      to: 'sme-review',
      event: 'SUBMIT_FOR_SME_REVIEW',
      label: 'Submit for SME Review',
      guard: (ctx) => (ctx.data.wordCount as number) > 100,
      guardFailureReason: 'Response must have at least 100 words',
    },
    {
      id: 't4',
      from: 'sme-review',
      to: 'draft',
      event: 'REQUEST_CHANGES',
      label: 'Request Changes',
    },
    {
      id: 't5',
      from: 'sme-review',
      to: 'regulatory-review',
      event: 'SME_APPROVE',
      label: 'SME Approve',
      requiredRoles: ['sme', 'admin'],
    },
    {
      id: 't6',
      from: 'regulatory-review',
      to: 'sme-review',
      event: 'REQUEST_CHANGES',
      label: 'Request Changes',
    },
    {
      id: 't7',
      from: 'regulatory-review',
      to: 'qa-review',
      event: 'REGULATORY_APPROVE',
      label: 'Regulatory Approve',
      requiredRoles: ['regulatory-lead', 'admin'],
    },
    {
      id: 't8',
      from: 'qa-review',
      to: 'regulatory-review',
      event: 'REQUEST_CHANGES',
      label: 'Request Changes',
    },
    {
      id: 't9',
      from: 'qa-review',
      to: 'approved',
      event: 'QA_APPROVE',
      label: 'QA Approve',
      requiredRoles: ['qa', 'admin'],
    },
    {
      id: 't10',
      from: 'approved',
      to: 'submitted',
      event: 'SUBMIT',
      label: 'Submit to HA',
      guard: (ctx) => ctx.data.qualityScore !== undefined && (ctx.data.qualityScore as number) >= 80,
      guardFailureReason: 'Quality score must be at least 80',
    },
    {
      id: 't11',
      from: 'sme-review',
      to: 'rejected',
      event: 'REJECT',
      label: 'Reject',
    },
    {
      id: 't12',
      from: 'regulatory-review',
      to: 'rejected',
      event: 'REJECT',
      label: 'Reject',
    },
    {
      id: 't13',
      from: 'rejected',
      to: 'draft',
      event: 'REOPEN',
      label: 'Reopen for Revision',
    },
  ],
  initialState: 'draft',
  finalStates: ['submitted'],
  errorStates: ['rejected'],
};

export const DOCUMENT_WORKFLOW: WorkflowDefinition = {
  id: 'document-workflow',
  name: 'Document Workflow',
  description: 'Document authoring and approval lifecycle',
  type: 'document',
  version: '1.0.0',
  states: [
    {
      id: 'draft',
      name: 'Draft',
      type: 'initial',
      color: 'slate',
      icon: <Edit3 className="w-4 h-4" />,
    },
    {
      id: 'in-review',
      name: 'In Review',
      type: 'intermediate',
      color: 'blue',
      icon: <Eye className="w-4 h-4" />,
    },
    {
      id: 'changes-requested',
      name: 'Changes Requested',
      type: 'intermediate',
      color: 'amber',
      icon: <AlertTriangle className="w-4 h-4" />,
    },
    {
      id: 'approved',
      name: 'Approved',
      type: 'intermediate',
      color: 'green',
      icon: <CheckCircle className="w-4 h-4" />,
    },
    {
      id: 'published',
      name: 'Published',
      type: 'final',
      color: 'emerald',
      icon: <FileText className="w-4 h-4" />,
    },
    {
      id: 'archived',
      name: 'Archived',
      type: 'final',
      color: 'slate',
      icon: <Lock className="w-4 h-4" />,
    },
  ],
  transitions: [
    { id: 'd1', from: 'draft', to: 'in-review', event: 'SUBMIT_FOR_REVIEW', label: 'Submit for Review' },
    { id: 'd2', from: 'in-review', to: 'draft', event: 'CANCEL_REVIEW', label: 'Cancel Review' },
    { id: 'd3', from: 'in-review', to: 'changes-requested', event: 'REQUEST_CHANGES', label: 'Request Changes' },
    { id: 'd4', from: 'in-review', to: 'approved', event: 'APPROVE', label: 'Approve' },
    { id: 'd5', from: 'changes-requested', to: 'draft', event: 'REVISE', label: 'Revise' },
    { id: 'd6', from: 'approved', to: 'published', event: 'PUBLISH', label: 'Publish' },
    { id: 'd7', from: 'approved', to: 'draft', event: 'REVOKE_APPROVAL', label: 'Revoke Approval' },
    { id: 'd8', from: 'published', to: 'archived', event: 'ARCHIVE', label: 'Archive' },
    { id: 'd9', from: 'published', to: 'draft', event: 'CREATE_NEW_VERSION', label: 'Create New Version' },
  ],
  initialState: 'draft',
  finalStates: ['published', 'archived'],
};

export const SUBMISSION_WORKFLOW: WorkflowDefinition = {
  id: 'submission-workflow',
  name: 'Submission Workflow',
  description: 'eCTD submission assembly and gateway lifecycle',
  type: 'submission',
  version: '1.0.0',
  states: [
    {
      id: 'planning',
      name: 'Planning',
      type: 'initial',
      color: 'slate',
      icon: <Edit3 className="w-4 h-4" />,
    },
    {
      id: 'assembling',
      name: 'Assembling',
      type: 'intermediate',
      color: 'blue',
      icon: <GitBranch className="w-4 h-4" />,
    },
    {
      id: 'validating',
      name: 'Validating',
      type: 'intermediate',
      color: 'amber',
      icon: <Zap className="w-4 h-4" />,
    },
    {
      id: 'validation-failed',
      name: 'Validation Failed',
      type: 'error',
      color: 'red',
      icon: <XCircle className="w-4 h-4" />,
    },
    {
      id: 'ready-for-gateway',
      name: 'Ready for Gateway',
      type: 'intermediate',
      color: 'green',
      icon: <CheckCircle className="w-4 h-4" />,
    },
    {
      id: 'gateway-submission',
      name: 'Gateway Submission',
      type: 'intermediate',
      color: 'purple',
      icon: <Send className="w-4 h-4" />,
    },
    {
      id: 'gateway-acknowledged',
      name: 'Acknowledged',
      type: 'final',
      color: 'emerald',
      icon: <CheckCircle className="w-4 h-4" />,
    },
    {
      id: 'gateway-rejected',
      name: 'Gateway Rejected',
      type: 'error',
      color: 'red',
      icon: <XCircle className="w-4 h-4" />,
    },
  ],
  transitions: [
    { id: 's1', from: 'planning', to: 'assembling', event: 'START_ASSEMBLY', label: 'Start Assembly' },
    { id: 's2', from: 'assembling', to: 'planning', event: 'CANCEL', label: 'Cancel' },
    { id: 's3', from: 'assembling', to: 'validating', event: 'RUN_VALIDATION', label: 'Run Validation' },
    { id: 's4', from: 'validating', to: 'validation-failed', event: 'VALIDATION_FAILED', label: 'Validation Failed', automated: true },
    { id: 's5', from: 'validating', to: 'ready-for-gateway', event: 'VALIDATION_PASSED', label: 'Validation Passed', automated: true },
    { id: 's6', from: 'validation-failed', to: 'assembling', event: 'FIX_ISSUES', label: 'Fix Issues' },
    { id: 's7', from: 'ready-for-gateway', to: 'gateway-submission', event: 'SUBMIT_TO_GATEWAY', label: 'Submit to Gateway' },
    { id: 's8', from: 'gateway-submission', to: 'gateway-acknowledged', event: 'GATEWAY_ACK', label: 'Acknowledged', automated: true },
    { id: 's9', from: 'gateway-submission', to: 'gateway-rejected', event: 'GATEWAY_REJECT', label: 'Rejected', automated: true },
    { id: 's10', from: 'gateway-rejected', to: 'assembling', event: 'REVISE_SUBMISSION', label: 'Revise Submission' },
  ],
  initialState: 'planning',
  finalStates: ['gateway-acknowledged'],
  errorStates: ['validation-failed', 'gateway-rejected'],
};

// ============================================================================
// WORKFLOW ENGINE HOOK
// ============================================================================

export interface UseWorkflowEngineOptions {
  definition: WorkflowDefinition;
  initialContext?: Partial<WorkflowContext>;
  onTransition?: (entry: WorkflowHistoryEntry) => void;
  onError?: (error: Error) => void;
}

export function useWorkflowEngine(options: UseWorkflowEngineOptions) {
  const { definition, initialContext, onTransition, onError } = options;

  const [currentState, setCurrentState] = useState(definition.initialState);
  const [history, setHistory] = useState<WorkflowHistoryEntry[]>([]);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [context, setContext] = useState<WorkflowContext>({
    entityId: initialContext?.entityId || '',
    entityType: initialContext?.entityType || '',
    currentState: definition.initialState,
    previousStates: [],
    data: initialContext?.data || {},
    userId: initialContext?.userId,
    userRole: initialContext?.userRole,
    timestamp: new Date().toISOString(),
  });

  // Get current state definition
  const currentStateDef = useMemo(
    () => definition.states.find(s => s.id === currentState),
    [definition.states, currentState]
  );

  // Get available transitions from current state
  const availableTransitions = useMemo(
    () => definition.transitions.filter(t => t.from === currentState && !t.automated),
    [definition.transitions, currentState]
  );

  // Check if a transition can be executed
  const canTransition = useCallback(
    async (transitionId: string): Promise<{ allowed: boolean; reason?: string }> => {
      const transition = definition.transitions.find(t => t.id === transitionId);
      if (!transition) {
        return { allowed: false, reason: 'Transition not found' };
      }

      if (transition.from !== currentState) {
        return { allowed: false, reason: 'Transition not available from current state' };
      }

      if (transition.requiredRoles && transition.requiredRoles.length > 0) {
        if (!context.userRole || !transition.requiredRoles.includes(context.userRole)) {
          return { allowed: false, reason: `Required role: ${transition.requiredRoles.join(' or ')}` };
        }
      }

      if (transition.guard) {
        try {
          const guardResult = await transition.guard(context);
          if (!guardResult) {
            return { allowed: false, reason: transition.guardFailureReason || 'Guard condition not met' };
          }
        } catch (err) {
          return { allowed: false, reason: 'Guard evaluation failed' };
        }
      }

      return { allowed: true };
    },
    [definition.transitions, currentState, context]
  );

  // Execute a transition
  const executeTransition = useCallback(
    async (transitionId: string, comment?: string): Promise<boolean> => {
      const transition = definition.transitions.find(t => t.id === transitionId);
      if (!transition) {
        onError?.(new Error('Transition not found'));
        return false;
      }

      const { allowed, reason } = await canTransition(transitionId);
      if (!allowed) {
        onError?.(new Error(reason));
        return false;
      }

      setIsTransitioning(true);

      try {
        // Exit current state
        const exitState = definition.states.find(s => s.id === currentState);
        if (exitState?.onExit) {
          await exitState.onExit();
        }

        // Execute transition action
        if (transition.action) {
          await transition.action(context);
        }

        // Enter new state
        const enterState = definition.states.find(s => s.id === transition.to);
        if (enterState?.onEnter) {
          await enterState.onEnter();
        }

        // Record history
        const historyEntry: WorkflowHistoryEntry = {
          id: `hist-${Date.now()}`,
          fromState: currentState,
          toState: transition.to,
          event: transition.event,
          timestamp: new Date().toISOString(),
          userId: context.userId,
          comment,
        };

        setHistory(prev => [...prev, historyEntry]);
        setCurrentState(transition.to);
        setContext(prev => ({
          ...prev,
          currentState: transition.to,
          previousStates: [...prev.previousStates, currentState],
          timestamp: new Date().toISOString(),
        }));

        onTransition?.(historyEntry);
        return true;
      } catch (err) {
        onError?.(err as Error);
        return false;
      } finally {
        setIsTransitioning(false);
      }
    },
    [definition, currentState, context, canTransition, onTransition, onError]
  );

  // Execute transition by event name
  const triggerEvent = useCallback(
    async (event: string, comment?: string): Promise<boolean> => {
      const transition = definition.transitions.find(
        t => t.from === currentState && t.event === event
      );
      if (!transition) {
        onError?.(new Error(`No transition for event "${event}" from state "${currentState}"`));
        return false;
      }
      return executeTransition(transition.id, comment);
    },
    [definition.transitions, currentState, executeTransition, onError]
  );

  // Update context data
  const updateContextData = useCallback((data: Record<string, unknown>) => {
    setContext(prev => ({
      ...prev,
      data: { ...prev.data, ...data },
    }));
  }, []);

  // Reset workflow
  const reset = useCallback(() => {
    setCurrentState(definition.initialState);
    setHistory([]);
    setContext(prev => ({
      ...prev,
      currentState: definition.initialState,
      previousStates: [],
      timestamp: new Date().toISOString(),
    }));
  }, [definition.initialState]);

  // Check if workflow is complete
  const isComplete = definition.finalStates.includes(currentState);
  const isError = definition.errorStates?.includes(currentState) || false;

  return {
    currentState,
    currentStateDef,
    availableTransitions,
    history,
    context,
    isTransitioning,
    isComplete,
    isError,
    canTransition,
    executeTransition,
    triggerEvent,
    updateContextData,
    reset,
  };
}

// ============================================================================
// VISUAL COMPONENTS
// ============================================================================

interface WorkflowStateDiagramProps {
  definition: WorkflowDefinition;
  currentState: string;
  history?: WorkflowHistoryEntry[];
  compact?: boolean;
  className?: string;
}

export function WorkflowStateDiagram({
  definition,
  currentState,
  history = [],
  compact = false,
  className = '',
}: WorkflowStateDiagramProps) {
  const visitedStates = useMemo(
    () => new Set([definition.initialState, ...history.map(h => h.toState)]),
    [definition.initialState, history]
  );

  if (compact) {
    // Linear progress view
    const mainPath = definition.states.filter(
      s => s.type !== 'error' && (s.type === 'initial' || visitedStates.has(s.id) || s.id === currentState)
    );

    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {mainPath.map((state, idx) => {
          const isActive = state.id === currentState;
          const isCompleted = visitedStates.has(state.id) && !isActive;
          const stateDef = definition.states.find(s => s.id === state.id);

          return (
            <React.Fragment key={state.id}>
              {idx > 0 && (
                <ChevronRight className={`w-4 h-4 ${isCompleted ? 'text-accent-green' : 'text-text-muted'}`} />
              )}
              <div
                className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium
                  ${isActive ? 'bg-accent-blue/20 text-accent-blue' : ''}
                  ${isCompleted ? 'text-accent-green' : ''}
                  ${!isActive && !isCompleted ? 'text-text-muted' : ''}
                `}
              >
                {isCompleted && <CheckCircle className="w-3 h-3" />}
                {isActive && stateDef?.icon}
                {state.name}
              </div>
            </React.Fragment>
          );
        })}
      </div>
    );
  }

  // Full diagram view
  return (
    <div className={`p-4 bg-surface-base rounded-lg ${className}`}>
      <div className="flex flex-wrap gap-3">
        {definition.states.map(state => {
          const isActive = state.id === currentState;
          const isVisited = visitedStates.has(state.id);
          const isFinal = definition.finalStates.includes(state.id);
          const isError = definition.errorStates?.includes(state.id);

          return (
            <div
              key={state.id}
              className={`
                relative flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all
                ${isActive ? 'border-accent-blue bg-accent-blue/10 shadow-md' : ''}
                ${!isActive && isVisited ? 'border-accent-green/50 bg-accent-green/5' : ''}
                ${!isActive && !isVisited && !isError ? 'border-border bg-surface-card opacity-60' : ''}
                ${isError ? 'border-accent-red/50 bg-accent-red/5' : ''}
              `}
            >
              {state.icon && (
                <span className={isActive ? 'text-accent-blue' : isError ? 'text-accent-red' : 'text-text-muted'}>
                  {state.icon}
                </span>
              )}
              <div>
                <div className="text-sm font-medium text-text-primary">{state.name}</div>
                {state.description && (
                  <div className="text-xs text-text-muted">{state.description}</div>
                )}
              </div>
              {isActive && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-accent-blue rounded-full animate-pulse" />
              )}
              {isFinal && !isError && (
                <CheckCircle className="w-4 h-4 text-accent-green" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// WORKFLOW CONTROLS
// ============================================================================

interface WorkflowControlsProps {
  definition: WorkflowDefinition;
  currentState: string;
  availableTransitions: WorkflowTransition[];
  isTransitioning: boolean;
  onTransition: (transitionId: string) => void;
  canTransition: (transitionId: string) => Promise<{ allowed: boolean; reason?: string }>;
  className?: string;
}

export function WorkflowControls({
  definition,
  currentState,
  availableTransitions,
  isTransitioning,
  onTransition,
  canTransition,
  className = '',
}: WorkflowControlsProps) {
  const [transitionStatus, setTransitionStatus] = useState<Record<string, { allowed: boolean; reason?: string }>>({});

  // Check all transitions on mount and when they change
  React.useEffect(() => {
    const checkTransitions = async () => {
      const statuses: Record<string, { allowed: boolean; reason?: string }> = {};
      for (const t of availableTransitions) {
        statuses[t.id] = await canTransition(t.id);
      }
      setTransitionStatus(statuses);
    };
    checkTransitions();
  }, [availableTransitions, canTransition]);

  if (availableTransitions.length === 0) {
    const currentStateDef = definition.states.find(s => s.id === currentState);
    const isFinal = definition.finalStates.includes(currentState);
    const isError = definition.errorStates?.includes(currentState);

    return (
      <div className={`p-4 bg-surface-card rounded-lg text-center ${className}`}>
        <div className="flex items-center justify-center gap-2 text-text-muted">
          {isFinal ? (
            <>
              <CheckCircle className="w-5 h-5 text-accent-green" />
              <span>Workflow complete</span>
            </>
          ) : isError ? (
            <>
              <AlertTriangle className="w-5 h-5 text-accent-red" />
              <span>Workflow requires attention</span>
            </>
          ) : (
            <>
              <Clock className="w-5 h-5" />
              <span>Waiting for automated transition...</span>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {availableTransitions.map(transition => {
        const status = transitionStatus[transition.id];
        const isAllowed = status?.allowed ?? true;

        return (
          <div key={transition.id} className="relative group">
            <Button
              variant={isAllowed ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => onTransition(transition.id)}
              disabled={isTransitioning || !isAllowed}
              className="gap-2"
            >
              <ArrowRight className="w-4 h-4" />
              {transition.label || transition.event}
            </Button>
            {!isAllowed && status?.reason && (
              <div className="absolute bottom-full left-0 mb-2 px-2 py-1 text-xs bg-surface-elevated text-text-muted rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                {status.reason}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// WORKFLOW HISTORY
// ============================================================================

interface WorkflowHistoryPanelProps {
  history: WorkflowHistoryEntry[];
  definition: WorkflowDefinition;
  className?: string;
}

export function WorkflowHistoryPanel({
  history,
  definition,
  className = '',
}: WorkflowHistoryPanelProps) {
  if (history.length === 0) {
    return (
      <div className={`p-4 text-center text-text-muted text-sm ${className}`}>
        No workflow history yet
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {history.map((entry, idx) => {
        const fromState = definition.states.find(s => s.id === entry.fromState);
        const toState = definition.states.find(s => s.id === entry.toState);

        return (
          <div
            key={entry.id}
            className="flex items-start gap-3 p-3 bg-surface-card rounded-lg border border-border"
          >
            <div className="flex-shrink-0 mt-0.5">
              <History className="w-4 h-4 text-text-muted" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge color={fromState?.color || 'slate'} size="xs">
                  {fromState?.name || entry.fromState}
                </Badge>
                <ArrowRight className="w-3 h-3 text-text-muted" />
                <Badge color={toState?.color || 'slate'} size="xs">
                  {toState?.name || entry.toState}
                </Badge>
              </div>
              <div className="mt-1 text-xs text-text-muted">
                {new Date(entry.timestamp).toLocaleString()}
                {entry.userName && ` · ${entry.userName}`}
              </div>
              {entry.comment && (
                <div className="mt-1 text-sm text-text-secondary">{entry.comment}</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// WORKFLOW WIDGET (Compact)
// ============================================================================

interface WorkflowWidgetProps {
  title: string;
  definition: WorkflowDefinition;
  currentState: string;
  history?: WorkflowHistoryEntry[];
  availableTransitions?: WorkflowTransition[];
  onTransition?: (transitionId: string) => void;
  isTransitioning?: boolean;
  className?: string;
}

export function WorkflowWidget({
  title,
  definition,
  currentState,
  history = [],
  availableTransitions = [],
  onTransition,
  isTransitioning = false,
  className = '',
}: WorkflowWidgetProps) {
  const currentStateDef = definition.states.find(s => s.id === currentState);
  const isFinal = definition.finalStates.includes(currentState);
  const isError = definition.errorStates?.includes(currentState);

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-text-primary">{title}</h4>
          <Badge color={currentStateDef?.color || 'slate'} size="sm">
            {currentStateDef?.icon}
            {currentStateDef?.name || currentState}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <WorkflowStateDiagram
          definition={definition}
          currentState={currentState}
          history={history}
          compact
        />
        {availableTransitions.length > 0 && onTransition && (
          <div className="mt-3 flex flex-wrap gap-2">
            {availableTransitions.slice(0, 2).map(t => (
              <Button
                key={t.id}
                variant="secondary"
                size="xs"
                onClick={() => onTransition(t.id)}
                disabled={isTransitioning}
              >
                {t.label || t.event}
              </Button>
            ))}
            {availableTransitions.length > 2 && (
              <span className="text-xs text-text-muted self-center">
                +{availableTransitions.length - 2} more
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default WorkflowStateDiagram;
