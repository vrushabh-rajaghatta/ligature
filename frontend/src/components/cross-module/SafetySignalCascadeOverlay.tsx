

/**
 * SafetySignalCascadeOverlay - v0.27.84
 * 
 * Dramatic visual overlay showing the safety signal → label change → submission
 * cascade in real-time. Designed for investor demos to illustrate the "R&D Connected"
 * value proposition.
 * 
 * Triggers automatically when a safety-signal-confirmed event is emitted.
 * Shows each cascade action as it progresses from Safety → Labeling → Submissions.
 * 
 * @module components/cross-module/SafetySignalCascadeOverlay
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Shield, Tag, Send, CheckCircle2, Clock, ArrowRight, Zap, X,
  AlertTriangle, Loader2, Radio, FileText, Package, Activity,
  ChevronRight, Sparkles, BarChart3, Bell
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  useCrossModuleEventStore,
  type CrossModuleEvent,
  type CascadeAction,
} from '@/store/useCrossModuleEventStore';
import { useToastStore } from '@/components/ui/Toast';

// =============================================================================
// TYPES
// =============================================================================

interface CascadeStep {
  id: string;
  module: 'safety' | 'labeling' | 'submissions' | 'regulatory';
  title: string;
  description: string;
  status: 'pending' | 'active' | 'completed';
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  outputs?: string[];
}

interface SafetySignalCascadeOverlayProps {
  /** Auto-dismiss after completion (ms). 0 = manual dismiss */
  autoDismissDelay?: number;
  /** Callback when cascade completes */
  onComplete?: () => void;
  /** Callback to navigate to a module */
  onNavigateToModule?: (moduleId: string) => void;
}

// =============================================================================
// MODULE STYLING
// =============================================================================

const MODULE_STYLES = {
  safety: {
    icon: Shield,
    color: 'text-red-400',
    bgColor: 'bg-red-500/20',
    borderColor: 'border-red-500/50',
    glowColor: 'shadow-red-500/30',
    label: 'Safety',
  },
  labeling: {
    icon: Tag,
    color: 'text-teal-400',
    bgColor: 'bg-teal-500/20',
    borderColor: 'border-teal-500/50',
    glowColor: 'shadow-teal-500/30',
    label: 'Labeling',
  },
  submissions: {
    icon: Send,
    color: 'text-green-400',
    bgColor: 'bg-green-500/20',
    borderColor: 'border-green-500/50',
    glowColor: 'shadow-green-500/30',
    label: 'Submissions',
  },
  regulatory: {
    icon: FileText,
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/20',
    borderColor: 'border-cyan-500/50',
    glowColor: 'shadow-cyan-500/30',
    label: 'Regulatory',
  },
};

// =============================================================================
// COMPONENT
// =============================================================================

export function SafetySignalCascadeOverlay({
  autoDismissDelay = 5000,
  onComplete,
  onNavigateToModule,
}: SafetySignalCascadeOverlayProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [activeEvent, setActiveEvent] = useState<CrossModuleEvent | null>(null);
  const [cascadeSteps, setCascadeSteps] = useState<CascadeStep[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [completedOutputs, setCompletedOutputs] = useState<string[]>([]);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const stepTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Subscribe to cross-module events
  const eventFeed = useCrossModuleEventStore(s => s.eventFeed);
  const completeCascadeAction = useCrossModuleEventStore(s => s.completeCascadeAction);
  const addToast = useToastStore(s => s.addToast);
  
  // Build cascade steps from event payload
  const buildCascadeSteps = useCallback((event: CrossModuleEvent): CascadeStep[] => {
    const steps: CascadeStep[] = [];
    
    // Step 1: Safety signal confirmed (trigger point)
    steps.push({
      id: 'safety-trigger',
      module: 'safety',
      title: 'Safety Signal Confirmed',
      description: `${event.payload.signal || 'Signal'} for ${event.payload.product || 'Product'}`,
      status: 'completed', // Already complete since this is the trigger
      icon: Shield,
      color: MODULE_STYLES.safety.color,
      bgColor: MODULE_STYLES.safety.bgColor,
      outputs: [
        `PRR: ${event.payload.prr || '3.19'}`,
        `ROR: ${event.payload.ror || '3.82'}`,
        `Cases: ${event.payload.caseCount || '47'}`,
      ],
    });
    
    // Step 2: Labeling review initiated
    steps.push({
      id: 'labeling-review',
      module: 'labeling',
      title: 'Label Review Initiated',
      description: 'Automated review request created with section recommendations',
      status: 'pending',
      icon: Tag,
      color: MODULE_STYLES.labeling.color,
      bgColor: MODULE_STYLES.labeling.bgColor,
      outputs: [
        'Sections: 4.4, 4.2, 4.8',
        'Update Type: CCDS Enhancement',
        'Priority: High',
      ],
    });
    
    // Step 3: Regulatory notification
    steps.push({
      id: 'regulatory-notify',
      module: 'regulatory',
      title: 'Regulatory Affairs Notified',
      description: 'Safety update submission package initiated',
      status: 'pending',
      icon: FileText,
      color: MODULE_STYLES.regulatory.color,
      bgColor: MODULE_STYLES.regulatory.bgColor,
      outputs: [
        'Package Type: Safety Update',
        'Module 2.7.4 flagged',
        'Timeline: 30 days',
      ],
    });
    
    // Step 4: Submission planning
    steps.push({
      id: 'submission-queue',
      module: 'submissions',
      title: 'Submission Planning Updated',
      description: 'CBE-30 supplement added to submission queue',
      status: 'pending',
      icon: Send,
      color: MODULE_STYLES.submissions.color,
      bgColor: MODULE_STYLES.submissions.bgColor,
      outputs: [
        'Type: CBE-30 Supplement',
        'Target: FDA, EMA',
        'Documents linked',
      ],
    });
    
    return steps;
  }, []);
  
  // Process step progression
  const progressToNextStep = useCallback(() => {
    setCascadeSteps(prev => {
      const updated = [...prev];
      
      // Complete current step
      if (currentStepIndex < updated.length) {
        updated[currentStepIndex].status = 'completed';
        
        // Add outputs to completed list
        const stepOutputs = updated[currentStepIndex].outputs || [];
        setCompletedOutputs(prevOutputs => [...prevOutputs, ...stepOutputs]);
      }
      
      // Activate next step
      if (currentStepIndex + 1 < updated.length) {
        updated[currentStepIndex + 1].status = 'active';
      }
      
      return updated;
    });
    
    setCurrentStepIndex(prev => prev + 1);
  }, [currentStepIndex]);
  
  // Watch for safety-signal-confirmed events
  useEffect(() => {
    const latestEvent = eventFeed[0];
    
    if (
      latestEvent &&
      (latestEvent.type === 'safety-signal-confirmed' || latestEvent.type === 'label-change-recommended') &&
      !activeEvent
    ) {
      // Only trigger on first safety-signal-confirmed event
      if (latestEvent.type === 'safety-signal-confirmed') {
        setActiveEvent(latestEvent);
        setCascadeSteps(buildCascadeSteps(latestEvent));
        setCurrentStepIndex(0);
        setIsComplete(false);
        setCompletedOutputs([]);
        setIsVisible(true);
        
        // Show initial toast
        addToast({
          type: 'cross-module',
          message: 'Safety signal cascade initiated',
          sourceModule: 'safety',
          targetModule: 'labeling',
          duration: 3000,
        });
      }
    }
  }, [eventFeed, activeEvent, buildCascadeSteps, addToast]);
  
  // Step progression timer
  useEffect(() => {
    if (!isVisible || isComplete || currentStepIndex === 0) return;
    
    // Already at first step, set it to active
    if (currentStepIndex === 0 && cascadeSteps.length > 1) {
      setCascadeSteps(prev => {
        const updated = [...prev];
        if (updated[1]) {
          updated[1].status = 'active';
        }
        return updated;
      });
    }
    
    // Check if all steps complete
    if (currentStepIndex >= cascadeSteps.length) {
      setIsComplete(true);
      onComplete?.();
      
      // Auto-dismiss
      if (autoDismissDelay > 0) {
        timerRef.current = setTimeout(() => {
          handleDismiss();
        }, autoDismissDelay);
      }
      return;
    }
    
    // Progress to next step after delay
    stepTimerRef.current = setTimeout(() => {
      progressToNextStep();
    }, 1800); // 1.8s per step - visible but not tedious
    
    return () => {
      if (stepTimerRef.current) clearTimeout(stepTimerRef.current);
    };
  }, [isVisible, isComplete, currentStepIndex, cascadeSteps.length, progressToNextStep, autoDismissDelay, onComplete]);
  
  // Kick off the cascade after overlay appears
  useEffect(() => {
    if (isVisible && currentStepIndex === 0 && cascadeSteps.length > 1) {
      // Start cascade after brief delay
      const kickoffTimer = setTimeout(() => {
        // Activate step 1 (labeling)
        setCascadeSteps(prev => {
          const updated = [...prev];
          if (updated[1]) {
            updated[1].status = 'active';
          }
          return updated;
        });
        setCurrentStepIndex(1);
      }, 800);
      
      return () => clearTimeout(kickoffTimer);
    }
  }, [isVisible, currentStepIndex, cascadeSteps.length]);
  
  // Cleanup timers
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (stepTimerRef.current) clearTimeout(stepTimerRef.current);
    };
  }, []);
  
  const handleDismiss = () => {
    setIsVisible(false);
    setActiveEvent(null);
    setCascadeSteps([]);
    setCurrentStepIndex(0);
    setIsComplete(false);
    setCompletedOutputs([]);
  };
  
  const handleNavigateToModule = (moduleId: string) => {
    handleDismiss();
    onNavigateToModule?.(moduleId);
  };
  
  if (!isVisible) return null;
  
  // Calculate progress
  const completedSteps = cascadeSteps.filter(s => s.status === 'completed').length;
  const progress = cascadeSteps.length > 0 ? (completedSteps / cascadeSteps.length) * 100 : 0;
  
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-300">
      <div className="w-full max-w-3xl mx-4">
        {/* Main Card */}
        <div className="bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden shadow-2xl">
          {/* Header */}
          <div className="bg-gradient-to-r from-red-500/20 via-teal-500/10 to-green-500/20 px-6 py-4 border-b border-slate-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-red-500 to-orange-500 rounded-lg shadow-lg shadow-red-500/30">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Cross-Module Cascade</h2>
                  <p className="text-sm text-slate-400">
                    Safety Signal → Label Update → Submission
                  </p>
                </div>
              </div>
              <button
                onClick={handleDismiss}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Progress bar */}
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>{completedSteps} of {cascadeSteps.length} steps</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-red-500 via-teal-500 to-green-500 transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>
          
          {/* Cascade Steps */}
          <div className="p-6">
            <div className="space-y-4">
              {cascadeSteps.map((step, index) => {
                const moduleStyle = MODULE_STYLES[step.module];
                const Icon = step.icon;
                const isActive = step.status === 'active';
                const isCompleted = step.status === 'completed';
                
                return (
                  <div
                    key={step.id}
                    className={`relative flex gap-4 p-4 rounded-xl transition-all duration-500 ${
                      isActive 
                        ? `bg-gradient-to-r from-slate-800 to-slate-800/50 border ${moduleStyle.borderColor} shadow-lg ${moduleStyle.glowColor}`
                        : isCompleted
                        ? 'bg-slate-800/50 border border-green-500/30'
                        : 'bg-slate-800/30 border border-slate-700/50 opacity-60'
                    }`}
                  >
                    {/* Step number and icon */}
                    <div className="flex flex-col items-center gap-2">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                        isActive 
                          ? `${moduleStyle.bgColor} border-2 ${moduleStyle.borderColor} animate-pulse`
                          : isCompleted
                          ? 'bg-green-500/20 border-2 border-green-500/50'
                          : 'bg-slate-700 border-2 border-slate-600'
                      }`}>
                        {isCompleted ? (
                          <CheckCircle2 className="w-5 h-5 text-green-400" />
                        ) : (
                          <Icon className={`w-5 h-5 ${isActive ? moduleStyle.color : 'text-slate-400'}`} />
                        )}
                      </div>
                      {index < cascadeSteps.length - 1 && (
                        <div className={`w-0.5 h-8 ${isCompleted ? 'bg-green-500/50' : 'bg-slate-700'}`} />
                      )}
                    </div>
                    
                    {/* Step content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-sm font-semibold ${
                          isActive ? moduleStyle.color : isCompleted ? 'text-green-400' : 'text-slate-400'
                        }`}>
                          {step.title}
                        </span>
                        {isActive && (
                          <Badge className={`${moduleStyle.bgColor} ${moduleStyle?.color ?? ''} border-0 text-[10px] animate-pulse`}>
                            <Radio className="w-2.5 h-2.5 mr-1" />
                            PROCESSING
                          </Badge>
                        )}
                        {isCompleted && (
                          <Badge className="bg-green-500/30 text-green-300 border-0 text-[10px]">
                            <CheckCircle2 className="w-2.5 h-2.5 mr-1" />
                            DONE
                          </Badge>
                        )}
                      </div>
                      
                      <p className="text-xs text-slate-400 mb-2">{step.description}</p>
                      
                      {/* Outputs (shown when completed or active) */}
                      {(isCompleted || isActive) && step.outputs && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {step.outputs.map((output, i) => (
                            <span
                              key={i}
                              className={`text-[10px] px-2 py-1 rounded-full ${
                                isCompleted 
                                  ? 'bg-green-500/10 text-green-300' 
                                  : `${moduleStyle.bgColor} ${moduleStyle?.color ?? ''}`
                              }`}
                            >
                              {output}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    {/* Navigation button (shown when completed) */}
                    {isCompleted && (
                      <button
                        onClick={() => handleNavigateToModule(step.module)}
                        className="self-center p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                        title={`Go to ${moduleStyle?.label ?? ''}`}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* Footer */}
          <div className="px-6 py-4 bg-slate-800/50 border-t border-slate-700">
            {isComplete ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-green-400">
                  <Sparkles className="w-4 h-4" />
                  <span className="text-sm font-medium">Cascade complete</span>
                  <span className="text-xs text-slate-400">
                    Traditional process: weeks → Ligature: seconds
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleNavigateToModule('labeling')}
                    className="text-teal-400 hover:text-teal-300"
                  >
                    <Tag className="w-4 h-4 mr-1" />
                    View Label Update
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleNavigateToModule('submissions')}
                    className="text-green-400 hover:text-green-300"
                  >
                    <Send className="w-4 h-4 mr-1" />
                    View Submission
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between text-slate-400">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Processing cascade...</span>
                </div>
                <span className="text-xs">
                  Automated cross-module data flow
                </span>
              </div>
            )}
          </div>
        </div>
        
        {/* Value proposition callout */}
        <div className="mt-4 text-center">
          <p className="text-sm text-slate-400">
            <span className="text-white font-medium">R&D Connected</span>
            {' '}— One click triggers coordinated action across Safety, Labeling, and Submissions
          </p>
        </div>
      </div>
    </div>
  );
}

export default SafetySignalCascadeOverlay;
