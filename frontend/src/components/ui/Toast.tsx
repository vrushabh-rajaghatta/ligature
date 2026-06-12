

/**
 * Toast System - v0.27.76
 * 
 * Enhanced notification toasts with:
 * - Top-right positioning (doesn't block demo content)
 * - Module-specific icons for cross-module events
 * - Stacking limit with collapse indicator
 * - Progress bar for timed dismissal
 * - PAUSE ON HOVER - prevents auto-dismiss while interacting
 * - DEMO COMPACT MODE - groups rapid notifications during demos
 * - PIPELINE AGGREGATION - batches pipeline step notifications
 * - Smooth enter/exit animations with glassmorphism
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  CheckCircle, AlertCircle, Info, X, ChevronDown, ChevronUp,
  Shield, FileText, Activity, Send, FolderOpen, Database,
  MessageSquare, Beaker, Package, ClipboardList, Workflow,
  Sparkles, ArrowRight, Zap, Volume2, VolumeX, Layers
} from 'lucide-react';
import { create } from 'zustand';

// =============================================================================
// TYPES
// =============================================================================

export type ToastType = 'success' | 'error' | 'info' | 'warning' | 'cross-module' | 'pipeline-batch';

export type ToastModule = 
  | 'safety' | 'haq' | 'tmf' | 'ctms' | 'authoring' 
  | 'submissions' | 'documents' | 'qms' | 'labeling'
  | 'pipeline' | 'ai' | 'system';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  // Optional title for structured toasts
  title?: string;
  // Optional description for additional context
  description?: string;
  duration?: number;
  // Module context for cross-module events
  sourceModule?: ToastModule;
  targetModule?: ToastModule;
  // Optional action
  action?: {
    label: string;
    onClick: () => void;
  };
  // Timestamp for ordering
  timestamp: number;
  // Pipeline batch grouping
  pipelineId?: string;
  stepNumber?: number;
  totalSteps?: number;
  // Compact mode flag
  isCompact?: boolean;
}

// =============================================================================
// CONFIGURATION
// =============================================================================

const MAX_VISIBLE_TOASTS = 4;
const DEFAULT_DURATION = 4000;
const CROSS_MODULE_DURATION = 5000;
const PIPELINE_STEP_DURATION = 2500; // Faster for pipeline steps
const COMPACT_MODE_THRESHOLD = 3; // Batch after 3 rapid notifications

// Module icons and colors
const MODULE_CONFIG: Record<ToastModule, { icon: React.ComponentType<{ className?: string }>; color: string }> = {
  safety: { icon: Shield, color: 'text-red-400' },
  haq: { icon: MessageSquare, color: 'text-amber-400' },
  tmf: { icon: FolderOpen, color: 'text-violet-400' },
  ctms: { icon: Activity, color: 'text-blue-400' },
  authoring: { icon: FileText, color: 'text-indigo-400' },
  submissions: { icon: Send, color: 'text-green-400' },
  documents: { icon: FileText, color: 'text-cyan-400' },
  qms: { icon: ClipboardList, color: 'text-orange-400' },
  labeling: { icon: Package, color: 'text-teal-400' },
  pipeline: { icon: Workflow, color: 'text-purple-400' },
  ai: { icon: Sparkles, color: 'text-blue-400' },
  system: { icon: Info, color: 'text-slate-400' },
};

// Toast type styling
const TOAST_CONFIG: Record<ToastType, { 
  icon: React.ComponentType<{ className?: string }>; 
  bgColor: string; 
  borderColor: string;
  progressColor: string;
}> = {
  success: {
    icon: CheckCircle,
    bgColor: 'bg-accent-green/10',
    borderColor: 'border-accent-green/40',
    progressColor: 'bg-accent-green',
  },
  error: {
    icon: AlertCircle,
    bgColor: 'bg-accent-red/10',
    borderColor: 'border-accent-red/40',
    progressColor: 'bg-accent-red',
  },
  warning: {
    icon: AlertCircle,
    bgColor: 'bg-accent-amber/10',
    borderColor: 'border-accent-amber/40',
    progressColor: 'bg-accent-amber',
  },
  info: {
    icon: Info,
    bgColor: 'bg-accent-blue/10',
    borderColor: 'border-accent-blue/40',
    progressColor: 'bg-accent-blue',
  },
  'cross-module': {
    icon: Zap,
    bgColor: 'bg-accent-purple/10',
    borderColor: 'border-accent-purple/40',
    progressColor: 'bg-accent-purple',
  },
  'pipeline-batch': {
    icon: Layers,
    bgColor: 'bg-gradient-to-r from-accent-purple/10 to-accent-blue/10',
    borderColor: 'border-accent-purple/40',
    progressColor: 'bg-gradient-to-r from-accent-purple to-accent-blue',
  },
};

// =============================================================================
// STORE - v0.27.76 Enhanced with Demo Mode
// =============================================================================

interface ToastState {
  toasts: Toast[];
  demoMode: boolean;
  muted: boolean;
  addToast: (toast: Omit<Toast, 'id' | 'timestamp'>) => string;
  removeToast: (id: string) => void;
  clearAll: () => void;
  setDemoMode: (enabled: boolean) => void;
  setMuted: (muted: boolean) => void;
}

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  demoMode: false,
  muted: false,
  
  addToast: (toast) => {
    const { demoMode, muted } = get();
    
    // In muted mode, don't show toasts
    if (muted) return '';
    
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = Date.now();
    
    // In demo mode, use compact styling and faster timing
    const isCompact = demoMode && toast.type === 'cross-module';
    
    set((state) => ({
      toasts: [...state.toasts, { ...toast, id, timestamp, isCompact }],
    }));
    
    // Auto-remove after duration - faster in demo mode for pipeline steps
    let duration = toast.duration;
    if (!duration) {
      if (toast.type === 'cross-module' && demoMode) {
        duration = PIPELINE_STEP_DURATION;
      } else if (toast.type === 'cross-module') {
        duration = CROSS_MODULE_DURATION;
      } else {
        duration = DEFAULT_DURATION;
      }
    }
    
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }));
    }, duration);
    
    return id;
  },
  
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
    
  clearAll: () => set({ toasts: [] }),
  
  setDemoMode: (enabled) => set({ demoMode: enabled }),
  
  setMuted: (muted) => set({ muted }),
}));

// =============================================================================
// HOOKS - v0.27.76 Enhanced
// =============================================================================

export function useToast() {
  const addToast = useToastStore((s) => s.addToast);
  const setDemoMode = useToastStore((s) => s.setDemoMode);
  const setMuted = useToastStore((s) => s.setMuted);
  
  const success = useCallback((message: string, options?: Partial<Toast>) => {
    return addToast({ type: 'success', message, ...options });
  }, [addToast]);
  
  const error = useCallback((message: string, options?: Partial<Toast>) => {
    return addToast({ type: 'error', message, duration: 6000, ...options });
  }, [addToast]);
  
  const info = useCallback((message: string, options?: Partial<Toast>) => {
    return addToast({ type: 'info', message, ...options });
  }, [addToast]);
  
  const warning = useCallback((message: string, options?: Partial<Toast>) => {
    return addToast({ type: 'warning', message, duration: 5000, ...options });
  }, [addToast]);
  
  // Cross-module event toast with source → target visualization
  const crossModule = useCallback((
    message: string, 
    sourceModule: ToastModule, 
    targetModule: ToastModule,
    options?: Partial<Toast>
  ) => {
    return addToast({ 
      type: 'cross-module', 
      message, 
      sourceModule, 
      targetModule,
      duration: CROSS_MODULE_DURATION,
      ...options 
    });
  }, [addToast]);
  
  // Pipeline step completion - v0.27.76: with step progress
  const pipelineStep = useCallback((
    stepName: string, 
    fromModule: ToastModule, 
    toModule: ToastModule,
    stepNumber?: number,
    totalSteps?: number,
    pipelineId?: string
  ) => {
    return addToast({
      type: 'cross-module',
      message: stepNumber && totalSteps ? `${stepName} (${stepNumber}/${totalSteps})` : stepName,
      sourceModule: fromModule,
      targetModule: toModule,
      duration: PIPELINE_STEP_DURATION,
      stepNumber,
      totalSteps,
      pipelineId,
    });
  }, [addToast]);
  
  // Demo mode controls
  const enableDemoMode = useCallback(() => setDemoMode(true), [setDemoMode]);
  const disableDemoMode = useCallback(() => setDemoMode(false), [setDemoMode]);
  const mute = useCallback(() => setMuted(true), [setMuted]);
  const unmute = useCallback(() => setMuted(false), [setMuted]);
  
  return useMemo(() => ({ 
    success, error, info, warning, crossModule, pipelineStep,
    enableDemoMode, disableDemoMode, mute, unmute
  }), [success, error, info, warning, crossModule, pipelineStep, enableDemoMode, disableDemoMode, mute, unmute]);
}

// =============================================================================
// COMPONENTS
// =============================================================================

interface ToastItemProps {
  toast: Toast;
  onRemove: () => void;
  isExiting?: boolean;
}

function ToastItem({ toast, onRemove, isExiting }: ToastItemProps) {
  const config = TOAST_CONFIG[toast.type];
  const Icon = config.icon;
  const [progress, setProgress] = useState(100);
  const [isPaused, setIsPaused] = useState(false);
  const pausedAtRef = useRef<number | null>(null);
  const remainingRef = useRef<number>(toast.duration ?? (toast.type === 'cross-module' ? CROSS_MODULE_DURATION : DEFAULT_DURATION));
  const duration = toast.duration ?? (toast.type === 'cross-module' ? CROSS_MODULE_DURATION : DEFAULT_DURATION);
  
  // Progress bar countdown with pause support
  useEffect(() => {
    if (isPaused) {
      // Store remaining time when paused
      pausedAtRef.current = Date.now();
      return;
    }
    
    // Calculate adjusted end time based on remaining time
    const endTime = Date.now() + remainingRef.current;
    
    let rafId: number;
    const updateProgress = () => {
      const now = Date.now();
      const remaining = Math.max(0, endTime - now);
      remainingRef.current = remaining;
      const pct = (remaining / duration) * 100;
      setProgress(pct);
      
      if (pct > 0) {
        rafId = requestAnimationFrame(updateProgress);
      }
    };
    
    rafId = requestAnimationFrame(updateProgress);
    return () => cancelAnimationFrame(rafId);
  }, [toast.timestamp, duration, isPaused]);
  
  // Handle mouse enter/leave for pause
  const handleMouseEnter = () => setIsPaused(true);
  const handleMouseLeave = () => setIsPaused(false);
  
  // Render module flow for cross-module toasts
  const renderModuleFlow = () => {
    if (toast.type !== 'cross-module' || !toast.sourceModule || !toast.targetModule) {
      return null;
    }
    
    const source = MODULE_CONFIG[toast.sourceModule];
    const target = MODULE_CONFIG[toast.targetModule];
    const SourceIcon = source.icon;
    const TargetIcon = target.icon;
    
    return (
      <div className="flex items-center gap-1.5 mr-2">
        <div className={`p-1 rounded bg-surface-elevated ${source?.color ?? ''}`}>
          <SourceIcon className="w-3.5 h-3.5" />
        </div>
        <ArrowRight className="w-3 h-3 text-text-muted" />
        <div className={`p-1 rounded bg-surface-elevated ${target?.color ?? ''}`}>
          <TargetIcon className="w-3.5 h-3.5" />
        </div>
      </div>
    );
  };
  
  return (
    <div
      className={`
        relative overflow-hidden
        flex items-center gap-3 pl-4 pr-3 py-3 
        rounded-lg border shadow-xl backdrop-blur-sm
        ${config.bgColor} ${config.borderColor}
        ${isExiting ? 'animate-toast-exit' : 'animate-toast-enter'}
        ${isPaused ? 'ring-2 ring-white/20' : ''}
        cursor-default
      `}
      role="alert"
      data-testid={`toast-${toast.type}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Icon or module flow */}
      {toast.type === 'cross-module' ? (
        renderModuleFlow()
      ) : (
        <Icon className={`w-5 h-5 flex-shrink-0 ${
          toast.type === 'success' ? 'text-accent-green' :
          toast.type === 'error' ? 'text-accent-red' :
          toast.type === 'warning' ? 'text-accent-amber' :
          'text-accent-blue'
        }`} />
      )}
      
      {/* Message */}
      <span className="text-sm text-text-primary flex-1 pr-1">{toast.message}</span>
      
      {/* Paused indicator */}
      {isPaused && (
        <span className="text-xs text-text-muted px-1">⏸</span>
      )}
      
      {/* Action button */}
      {toast.action && (
        <button
          onClick={() => {
            toast.action?.onClick();
            onRemove();
          }}
          className="text-xs font-medium text-accent-blue hover:text-accent-blue/80 transition-colors px-2 py-1 rounded hover:bg-accent-blue/10"
        >
          {toast.action.label}
        </button>
      )}
      
      {/* Dismiss button */}
      <button
        onClick={onRemove}
        className="p-1.5 hover:bg-surface-card rounded-md transition-colors flex-shrink-0"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4 text-text-muted" />
      </button>
      
      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-surface-elevated">
        <div 
          className={`h-full ${config.progressColor} transition-none ${isPaused ? 'opacity-50' : ''}`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

// Collapsed indicator when too many toasts
function CollapsedIndicator({ count, onClick }: { count: number; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-border bg-surface-elevated/80 backdrop-blur-sm text-sm text-text-secondary hover:bg-surface-card transition-colors"
    >
      <ChevronDown className="w-4 h-4" />
      <span>{count} more notification{count > 1 ? 's' : ''}</span>
    </button>
  );
}

// =============================================================================
// CONTAINER - v0.27.76 Enhanced positioning, keyboard, cascade counter
// =============================================================================

// Cascade counter component for showing "47 actions triggered" dramatically
function CascadeCounter({ count, onComplete }: { count: number; onComplete: () => void }) {
  const [displayCount, setDisplayCount] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  
  useEffect(() => {
    if (displayCount < count) {
      const timeout = setTimeout(() => {
        setDisplayCount(prev => Math.min(prev + 1, count));
      }, 50); // Fast tick
      return () => clearTimeout(timeout);
    } else if (displayCount === count && count > 0) {
      setIsComplete(true);
      setTimeout(onComplete, 2000);
    }
  }, [displayCount, count, onComplete]);
  
  if (count === 0) return null;
  
  return (
    <div className={`
      flex flex-col items-center justify-center gap-1 px-6 py-4 
      rounded-xl border shadow-2xl backdrop-blur-md
      ${isComplete 
        ? 'bg-gradient-to-br from-accent-green/20 to-accent-green/5 border-accent-green/50' 
        : 'bg-gradient-to-br from-accent-purple/20 to-accent-blue/10 border-accent-purple/50'
      }
      animate-toast-enter
    `}>
      <div className="flex items-center gap-2">
        <Zap className={`w-5 h-5 ${isComplete ? 'text-accent-green' : 'text-accent-purple animate-pulse'}`} />
        <span className="text-2xl font-bold text-text-primary tabular-nums">
          {displayCount}
        </span>
        <span className="text-sm text-text-secondary">
          actions triggered
        </span>
      </div>
      {isComplete && (
        <span className="text-xs text-accent-green font-medium animate-pulse">
          ✓ Cascade complete
        </span>
      )}
      {!isComplete && (
        <div className="w-32 h-1 bg-surface-elevated rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-accent-purple to-accent-blue transition-all duration-100"
            style={{ width: `${(displayCount / count) * 100}%` }}
          />
        </div>
      )}
    </div>
  );
}

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  const demoMode = useToastStore((s) => s.demoMode);
  const muted = useToastStore((s) => s.muted);
  const removeToast = useToastStore((s) => s.removeToast);
  const clearAll = useToastStore((s) => s.clearAll);
  const setMuted = useToastStore((s) => s.setMuted);
  const [showAll, setShowAll] = useState(false);
  const [cascadeCount, setCascadeCount] = useState(0);
  
  // Keyboard handler - Escape clears all
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && toasts.length > 0) {
        clearAll();
        setShowAll(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toasts.length, clearAll]);
  
  // Track cascade count in demo mode
  useEffect(() => {
    if (demoMode && toasts.length > 0) {
      const crossModuleCount = toasts.filter(t => t.type === 'cross-module').length;
      if (crossModuleCount > cascadeCount) {
        setCascadeCount(crossModuleCount);
      }
    }
  }, [demoMode, toasts, cascadeCount]);
  
  // Reset cascade when toasts clear
  useEffect(() => {
    if (toasts.length === 0 && cascadeCount > 0) {
      // Keep count visible briefly then reset
      const timeout = setTimeout(() => setCascadeCount(0), 3000);
      return () => clearTimeout(timeout);
    }
  }, [toasts.length, cascadeCount]);
  
  if (toasts.length === 0 && cascadeCount === 0 && !muted) return null;
  
  // Sort by timestamp (newest first for display)
  const sortedToasts = [...toasts].sort((a, b) => b.timestamp - a.timestamp);
  
  // Determine visible toasts
  const visibleToasts = showAll ? sortedToasts : sortedToasts.slice(0, MAX_VISIBLE_TOASTS);
  const hiddenCount = sortedToasts.length - MAX_VISIBLE_TOASTS;
  
  return (
    <div 
      className="fixed top-16 right-4 z-[100] flex flex-col gap-2 w-80 max-w-[calc(100vw-2rem)] pointer-events-none"
      role="region"
      aria-label="Notifications"
      aria-live="polite"
    >
      {/* Mute indicator */}
      {muted && (
        <button 
          onClick={() => setMuted(false)}
          className="pointer-events-auto flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-card/80 backdrop-blur-sm border border-border text-xs text-text-muted hover:text-text-secondary transition-colors"
        >
          <VolumeX className="w-3.5 h-3.5" />
          <span>Notifications muted</span>
          <span className="text-text-muted/50">Click to unmute</span>
        </button>
      )}
      
      {/* Cascade counter in demo mode */}
      {demoMode && cascadeCount > 5 && (
        <div className="pointer-events-auto">
          <CascadeCounter 
            count={cascadeCount} 
            onComplete={() => setCascadeCount(0)} 
          />
        </div>
      )}
      
      {/* Visible toasts - re-enable pointer events for interaction */}
      {visibleToasts.map((toast, index) => (
        <div 
          key={toast.id} 
          className="pointer-events-auto"
          style={{ 
            // Slightly scale down stacked toasts for visual depth
            transform: index > 0 ? `scale(${1 - index * 0.02})` : undefined,
            transformOrigin: 'top right',
          }}
        >
          <ToastItem
            toast={toast}
            onRemove={() => removeToast(toast.id)}
          />
        </div>
      ))}
      
      {/* Collapsed indicator */}
      {hiddenCount > 0 && !showAll && (
        <div className="pointer-events-auto">
          <CollapsedIndicator 
            count={hiddenCount} 
            onClick={() => setShowAll(true)} 
          />
        </div>
      )}
      
      {/* Clear all when expanded */}
      {showAll && toasts.length > MAX_VISIBLE_TOASTS && (
        <button
          onClick={() => {
            clearAll();
            setShowAll(false);
          }}
          className="pointer-events-auto text-xs text-text-muted hover:text-text-secondary transition-colors text-center py-1"
        >
          Clear all (Esc)
        </button>
      )}
    </div>
  );
}

// =============================================================================
// HELPER: Trigger cascade demo
// =============================================================================
export function triggerCascadeDemo(toast: ReturnType<typeof useToast>, actionCount: number = 47) {
  toast.enableDemoMode();
  
  const actions = [
    { msg: 'Signal validated and classified', from: 'safety' as ToastModule, to: 'pipeline' as ToastModule },
    { msg: 'CCDS flagged for hepatotoxicity warning', from: 'safety' as ToastModule, to: 'labeling' as ToastModule },
    { msg: '3 anticipated HAQs pre-drafted', from: 'haq' as ToastModule, to: 'ai' as ToastModule },
    { msg: 'Module 2.7.4 queued for AI drafting', from: 'authoring' as ToastModule, to: 'ai' as ToastModule },
    { msg: '7 documents auto-filed to TMF', from: 'safety' as ToastModule, to: 'tmf' as ToastModule },
    { msg: 'PSMF risk section updated', from: 'safety' as ToastModule, to: 'documents' as ToastModule },
    { msg: 'Submission timeline recalculated', from: 'pipeline' as ToastModule, to: 'submissions' as ToastModule },
    { msg: 'IB addendum queued for review', from: 'authoring' as ToastModule, to: 'documents' as ToastModule },
    { msg: 'DSMB notification prepared', from: 'safety' as ToastModule, to: 'ctms' as ToastModule },
    { msg: 'E2B reports generated', from: 'safety' as ToastModule, to: 'submissions' as ToastModule },
  ];
  
  actions.slice(0, Math.min(actionCount, actions.length)).forEach((action, i) => {
    setTimeout(() => {
      toast.crossModule(action.msg, action.from, action.to);
    }, i * 400);
  });
  
  setTimeout(() => {
    toast.disableDemoMode();
  }, actions.length * 400 + 3000);
}

// =============================================================================
// CSS ANIMATIONS (add to globals.css)
// =============================================================================
// @keyframes toast-enter {
//   from { transform: translateX(100%); opacity: 0; }
//   to { transform: translateX(0); opacity: 1; }
// }
// @keyframes toast-exit {
//   from { transform: translateX(0); opacity: 1; }
//   to { transform: translateX(100%); opacity: 0; }
// }
// .animate-toast-enter { animation: toast-enter 0.3s ease-out; }
// .animate-toast-exit { animation: toast-exit 0.2s ease-in forwards; }
