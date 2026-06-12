
// ============================================================================
// Demo Error Recovery Component - v142: Final POC Validation
// Enhanced error handling specifically for demo presentations
// Allows graceful recovery without breaking the demo flow
// ============================================================================


import React, { useState, useCallback, useEffect } from 'react';
import { 
  AlertOctagon, 
  RefreshCw, 
  SkipForward, 
  Home, 
  Play,
  Pause,
  ChevronRight,
  Wand2,
  ArrowLeft,
  CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useDemoStore, DEMO_STEP_ORDER, DEMO_STEPS, type DemoStep } from '@/store/useDemoStore';
import { useDemoAnalyticsStore } from '@/store/useDemoAnalyticsStore';

// ============================================================================
// TYPES
// ============================================================================

interface DemoErrorRecoveryProps {
  error: Error;
  errorInfo?: React.ErrorInfo;
  moduleName?: string;
  onRetry?: () => void;
  onSkipStep?: () => void;
  onGoHome?: () => void;
}

interface RecoveryAction {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  action: () => void;
  variant: 'primary' | 'secondary' | 'ghost';
  recommended?: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function DemoErrorRecovery({
  error,
  errorInfo,
  moduleName,
  onRetry,
  onSkipStep,
  onGoHome,
}: DemoErrorRecoveryProps) {
  // v204d-b7: Use individual selectors to prevent infinite loops from new object references
  const isDemoMode = useDemoStore(s => s.isDemoMode);
  const guidedDemoIsActive = useDemoStore(s => s.guidedDemo.isActive);
  const guidedDemoCurrentStep = useDemoStore(s => s.guidedDemo.currentStep);
  const advanceToStep = useDemoStore(s => s.advanceToStep);
  const stopGuidedDemo = useDemoStore(s => s.stopGuidedDemo);
  const resetGuidedDemo = useDemoStore(s => s.resetGuidedDemo);
  const addHighlightMoment = useDemoAnalyticsStore(s => s.addHighlightMoment);
  
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoverySuccess, setRecoverySuccess] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  
  const currentStepIndex = DEMO_STEP_ORDER.indexOf(guidedDemoCurrentStep);
  const hasNextStep = currentStepIndex < DEMO_STEP_ORDER.length - 1;
  const hasPrevStep = currentStepIndex > 0;
  
  // Log error occurrence
  useEffect(() => {
    if (isDemoMode && guidedDemoIsActive) {
      addHighlightMoment('concern', `Error in ${moduleName || 'module'}: ${error.message}`, guidedDemoCurrentStep);
    }
  }, [isDemoMode, guidedDemoIsActive, guidedDemoCurrentStep, moduleName, error.message, addHighlightMoment]);
  
  // Recovery handlers
  const handleRetry = useCallback(async () => {
    setIsRecovering(true);
    try {
      // Small delay to show loading state
      await new Promise(resolve => setTimeout(resolve, 500));
      onRetry?.();
      setRecoverySuccess(true);
      setTimeout(() => {
        setRecoverySuccess(false);
        setIsRecovering(false);
      }, 1500);
    } catch {
      setIsRecovering(false);
    }
  }, [onRetry]);
  
  const handleSkipToNext = useCallback(() => {
    if (hasNextStep) {
      const nextStep = DEMO_STEP_ORDER[currentStepIndex + 1];
      advanceToStep(nextStep);
      onSkipStep?.();
    }
  }, [hasNextStep, currentStepIndex, advanceToStep, onSkipStep]);
  
  const handleGoBack = useCallback(() => {
    if (hasPrevStep) {
      const prevStep = DEMO_STEP_ORDER[currentStepIndex - 1];
      advanceToStep(prevStep);
    }
  }, [hasPrevStep, currentStepIndex, advanceToStep]);
  
  const handleRestartDemo = useCallback(() => {
    resetGuidedDemo();
    window.location.reload();
  }, [resetGuidedDemo]);
  
  const handleExitDemo = useCallback(() => {
    stopGuidedDemo();
    onGoHome?.();
  }, [stopGuidedDemo, onGoHome]);
  
  // Build recovery actions based on context
  const recoveryActions: RecoveryAction[] = [];
  
  // Primary action: Retry
  if (onRetry) {
    recoveryActions.push({
      id: 'retry',
      label: 'Try Again',
      description: 'Attempt to reload this component',
      icon: RefreshCw,
      action: handleRetry,
      variant: 'primary',
      recommended: true,
    });
  }
  
  // Skip to next step (in guided demo)
  if (isDemoMode && guidedDemoIsActive && hasNextStep) {
    recoveryActions.push({
      id: 'skip',
      label: `Skip to ${DEMO_STEPS[DEMO_STEP_ORDER[currentStepIndex + 1]].title}`,
      description: 'Continue demo with next step',
      icon: SkipForward,
      action: handleSkipToNext,
      variant: 'secondary',
    });
  }
  
  // Go back to previous step
  if (isDemoMode && guidedDemoIsActive && hasPrevStep) {
    recoveryActions.push({
      id: 'back',
      label: 'Go Back',
      description: `Return to ${DEMO_STEPS[DEMO_STEP_ORDER[currentStepIndex - 1]].title}`,
      icon: ArrowLeft,
      action: handleGoBack,
      variant: 'ghost',
    });
  }
  
  // Restart demo
  if (isDemoMode) {
    recoveryActions.push({
      id: 'restart',
      label: 'Restart Demo',
      description: 'Start the demo from the beginning',
      icon: Play,
      action: handleRestartDemo,
      variant: 'ghost',
    });
  }
  
  // Exit to home
  recoveryActions.push({
    id: 'home',
    label: 'Exit Demo',
    description: 'Return to portfolio view',
    icon: Home,
    action: handleExitDemo,
    variant: 'ghost',
  });
  
  // Success state
  if (recoverySuccess) {
    return (
      <div className="flex items-center justify-center min-h-[300px] p-6">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-accent-green/10 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-accent-green" />
          </div>
          <h3 className="text-lg font-semibold text-text-primary mb-2">Recovery Successful</h3>
          <p className="text-text-muted">Continuing demo...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex items-center justify-center min-h-[400px] p-6">
      <div className="max-w-lg w-full">
        {/* Error Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-full bg-accent-amber/10 flex items-center justify-center">
            <AlertOctagon className="w-8 h-8 text-accent-amber" />
          </div>
        </div>
        
        {/* Error Message */}
        <div className="text-center mb-6">
          <h2 className="text-xl font-semibold text-text-primary mb-2">
            Demo Hiccup
          </h2>
          <p className="text-text-muted">
            {moduleName 
              ? `Something went wrong in the ${moduleName} module.`
              : 'Something went wrong while loading this view.'
            }
          </p>
          {isDemoMode && guidedDemoIsActive && (
            <p className="text-sm text-text-muted mt-2">
              Don't worry - you can continue the demo from here.
            </p>
          )}
        </div>
        
        {/* Recovery Actions */}
        <div className="space-y-3 mb-6">
          {recoveryActions.map((action) => (
            <button
              key={action.id}
              onClick={action.action}
              disabled={isRecovering}
              className={`
                w-full flex items-center gap-4 p-4 rounded-xl border transition-all
                ${action.recommended 
                  ? 'bg-brand-primary/10 border-brand-primary/30 hover:bg-brand-primary/20' 
                  : 'bg-surface-elevated border-border hover:bg-surface-base'
                }
                ${isRecovering ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              <div className={`
                w-10 h-10 rounded-lg flex items-center justify-center
                ${action.recommended ? 'bg-brand-primary text-white' : 'bg-surface-base text-text-muted'}
              `}>
                <action.icon className={`w-5 h-5 ${isRecovering && action.id === 'retry' ? 'animate-spin' : ''}`} />
              </div>
              <div className="flex-1 text-left">
                <div className="font-medium text-text-primary flex items-center gap-2">
                  {action.label}
                  {action.recommended && (
                    <span className="text-xs bg-brand-primary/20 text-brand-primary px-2 py-0.5 rounded-full">
                      Recommended
                    </span>
                  )}
                </div>
                <div className="text-sm text-text-muted">{action.description}</div>
              </div>
              <ChevronRight className="w-5 h-5 text-text-muted" />
            </button>
          ))}
        </div>
        
        {/* Technical Details Toggle */}
        <div className="border border-border rounded-lg overflow-hidden">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="w-full px-4 py-3 flex items-center justify-between text-sm text-text-muted hover:bg-surface-elevated transition-colors"
          >
            <span>Technical Details</span>
            <ChevronRight className={`w-4 h-4 transition-transform ${showDetails ? 'rotate-90' : ''}`} />
          </button>
          
          {showDetails && (
            <div className="border-t border-border bg-surface-elevated p-4 space-y-3">
              <div>
                <div className="text-xs font-medium text-text-muted mb-1">Error</div>
                <code className="text-xs text-accent-red block bg-surface-base p-2 rounded overflow-x-auto">
                  {error.message}
                </code>
              </div>
              
              {isDemoMode && guidedDemoIsActive && (
                <div>
                  <div className="text-xs font-medium text-text-muted mb-1">Demo Context</div>
                  <div className="text-xs bg-surface-base p-2 rounded space-y-1">
                    <div>Current Step: <span className="text-text-primary">{guidedDemoCurrentStep}</span></div>
                    <div>Step Index: <span className="text-text-primary">{currentStepIndex + 1} of {DEMO_STEP_ORDER.length}</span></div>
                    <div>Module: <span className="text-text-primary">{moduleName || 'Unknown'}</span></div>
                  </div>
                </div>
              )}
              
              {error.stack && (
                <div>
                  <div className="text-xs font-medium text-text-muted mb-1">Stack Trace</div>
                  <pre className="text-xs text-text-muted bg-surface-base p-2 rounded overflow-x-auto max-h-24">
                    {error.stack.split('\n').slice(0, 4).join('\n')}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Presenter Note */}
        {isDemoMode && (
          <div className="mt-6 p-4 bg-brand-primary/5 border border-brand-primary/20 rounded-lg">
            <div className="flex items-start gap-3">
              <Wand2 className="w-5 h-5 text-brand-primary flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-medium text-text-primary text-sm">Presenter Tip</div>
                <p className="text-xs text-text-muted mt-1">
                  "Let me skip ahead to show you the next capability - this is a demo environment 
                  and occasionally we see these edge cases that we're actively working on."
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// DEMO ERROR BOUNDARY
// Enhanced error boundary specifically for demo mode
// ============================================================================

interface DemoErrorBoundaryProps {
  children: React.ReactNode;
  moduleName?: string;
  onNavigateHome?: () => void;
}

interface DemoErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class DemoErrorBoundary extends React.Component<DemoErrorBoundaryProps, DemoErrorBoundaryState> {
  constructor(props: DemoErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }
  
  static getDerivedStateFromError(error: Error): Partial<DemoErrorBoundaryState> {
    return { hasError: true, error };
  }
  
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo });
    console.error('DemoErrorBoundary caught error:', error, errorInfo);
  }
  
  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };
  
  render() {
    if (this.state.hasError && this.state.error) {
      return (
        <DemoErrorRecovery
          error={this.state.error}
          errorInfo={this.state.errorInfo || undefined}
          moduleName={this.props.moduleName}
          onRetry={this.handleRetry}
          onGoHome={this.props.onNavigateHome}
        />
      );
    }
    
    return this.props.children;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default DemoErrorRecovery;
