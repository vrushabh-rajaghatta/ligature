
// ============================================================================
// Demo Health Monitor Component - v142: Final POC Validation
// Real-time monitoring of demo state, data consistency, and session health
// ============================================================================


import React, { useState, useEffect, useCallback } from 'react';
import { 
  Activity, 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle, 
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Wifi,
  WifiOff,
  Clock,
  Database,
  Cpu,
  Monitor,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useDemoStore } from '@/store/useDemoStore';
import { useDemoAnalyticsStore } from '@/store/useDemoAnalyticsStore';
import { 
  usePOCValidation, 
  useDemoHealthMonitor, 
  useBrowserFeatures,
  type ValidationCategory 
} from '@/hooks/usePOCValidation';

// ============================================================================
// TYPES
// ============================================================================

interface DemoHealthMonitorProps {
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  autoHide?: boolean;
  showOnlyOnIssues?: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function DemoHealthMonitor({
  position = 'bottom-right',
  autoHide = true,
  showOnlyOnIssues = false,
}: DemoHealthMonitorProps) {
  // v204d-b6: Use individual selectors instead of destructuring from store()
  const isDemoMode = useDemoStore((s) => s.isDemoMode);
  const guidedDemo = useDemoStore((s) => s.guidedDemo);
  const currentSession = useDemoAnalyticsStore((s) => s.currentSession);
  
  const {
    isValidating,
    lastValidation,
    results,
    overallHealth,
    passRate,
    runValidation,
    getErrors,
    getWarnings,
    getResultsByCategory,
  } = usePOCValidation();
  
  const demoHealth = useDemoHealthMonitor();
  const browserFeatures = useBrowserFeatures();
  
  const [isExpanded, setIsExpanded] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const [activeCategory, setActiveCategory] = useState<ValidationCategory | 'all'>('all');
  
  // Track online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    if (typeof window !== 'undefined') {
      setIsOnline(navigator.onLine);
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
    }
    
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      }
    };
  }, []);
  
  // Auto-hide when healthy
  useEffect(() => {
    if (autoHide && showOnlyOnIssues) {
      const hasIssues = overallHealth !== 'healthy' || demoHealth.status !== 'healthy';
      setIsVisible(hasIssues);
    }
  }, [autoHide, showOnlyOnIssues, overallHealth, demoHealth.status]);
  
  // Don't render if not in demo mode or if hidden
  if (!isDemoMode || !isVisible) return null;
  
  const errors = getErrors();
  const warnings = getWarnings();
  
  // Position classes
  const positionClasses = {
    'top-right': 'top-20 right-4',
    'top-left': 'top-20 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
  };
  
  // Health status icon
  const StatusIcon = overallHealth === 'healthy' 
    ? CheckCircle2 
    : overallHealth === 'warning' 
    ? AlertTriangle 
    : AlertCircle;
  
  const statusColors = {
    healthy: 'text-accent-green',
    warning: 'text-accent-amber',
    error: 'text-accent-red',
  };
  
  // Format duration
  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };
  
  // Session duration
  const sessionDuration = currentSession?.startedAt 
    ? Date.now() - currentSession.startedAt 
    : 0;
  
  // Filtered results
  const filteredResults = activeCategory === 'all' 
    ? results 
    : getResultsByCategory(activeCategory);
  
  return (
    <div 
      className={`fixed ${positionClasses[position]} z-50 transition-all duration-300`}
      style={{ maxWidth: isExpanded ? '400px' : '200px' }}
    >
      {/* Collapsed View */}
      {!isExpanded && (
        <button
          onClick={() => setIsExpanded(true)}
          className={`
            flex items-center gap-2 px-3 py-2 
            bg-surface-card border border-border rounded-lg shadow-lg
            hover:bg-surface-elevated transition-colors
          `}
        >
          <StatusIcon className={`w-4 h-4 ${statusColors[overallHealth]}`} />
          <span className="text-sm font-medium text-text-primary">
            {overallHealth === 'healthy' ? 'Demo Ready' : `${errors.length + warnings.length} Issues`}
          </span>
          {!isOnline && <WifiOff className="w-4 h-4 text-accent-red" />}
          <ChevronDown className="w-4 h-4 text-text-muted" />
        </button>
      )}
      
      {/* Expanded View */}
      {isExpanded && (
        <div className="bg-surface-card border border-border rounded-xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface-elevated">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-brand-primary" />
              <h3 className="font-semibold text-text-primary">Demo Health</h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => runValidation()}
                disabled={isValidating}
                className="p-1.5 hover:bg-surface-base rounded-md transition-colors"
                title="Re-run validation"
              >
                <RefreshCw className={`w-4 h-4 text-text-muted ${isValidating ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={() => setIsExpanded(false)}
                className="p-1.5 hover:bg-surface-base rounded-md transition-colors"
              >
                <ChevronUp className="w-4 h-4 text-text-muted" />
              </button>
            </div>
          </div>
          
          {/* Status Overview */}
          <div className="px-4 py-3 border-b border-border">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <StatusIcon className={`w-5 h-5 ${statusColors[overallHealth]}`} />
                <span className="font-medium text-text-primary capitalize">{overallHealth}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-text-muted">
                {isOnline ? (
                  <Wifi className="w-4 h-4 text-accent-green" />
                ) : (
                  <WifiOff className="w-4 h-4 text-accent-red" />
                )}
                <span>{passRate}% pass</span>
              </div>
            </div>
            
            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="px-2 py-1.5 bg-surface-base rounded-md">
                <div className="text-xs text-text-muted">Session</div>
                <div className="text-sm font-medium text-text-primary">
                  {sessionDuration > 0 ? formatDuration(sessionDuration) : '--:--'}
                </div>
              </div>
              <div className="px-2 py-1.5 bg-surface-base rounded-md">
                <div className="text-xs text-text-muted">Step</div>
                <div className="text-sm font-medium text-text-primary">
                  {guidedDemo.isActive ? guidedDemo.currentStep.split('-')[0] : 'N/A'}
                </div>
              </div>
              <div className="px-2 py-1.5 bg-surface-base rounded-md">
                <div className="text-xs text-text-muted">Checks</div>
                <div className="text-sm font-medium text-text-primary">{results.length}</div>
              </div>
            </div>
          </div>
          
          {/* Category Filter */}
          <div className="px-4 py-2 border-b border-border">
            <div className="flex flex-wrap gap-1">
              {(['all', 'demo-flow', 'browser-compat', 'performance', 'accessibility'] as const).map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`
                    px-2 py-1 text-xs rounded-md transition-colors
                    ${activeCategory === cat 
                      ? 'bg-brand-primary text-white' 
                      : 'bg-surface-base text-text-muted hover:text-text-primary'
                    }
                  `}
                >
                  {cat === 'all' ? 'All' : cat.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' ')}
                </button>
              ))}
            </div>
          </div>
          
          {/* Validation Results */}
          <div className="max-h-64 overflow-y-auto">
            {filteredResults.length === 0 ? (
              <div className="px-4 py-6 text-center text-text-muted">
                No results for this category
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filteredResults.slice(0, 15).map((result, idx) => (
                  <div 
                    key={`${result.code}-${idx}`}
                    className="px-4 py-2 flex items-start gap-3"
                  >
                    {result.isValid ? (
                      <CheckCircle2 className="w-4 h-4 text-accent-green flex-shrink-0 mt-0.5" />
                    ) : result.severity === 'error' ? (
                      <AlertCircle className="w-4 h-4 text-accent-red flex-shrink-0 mt-0.5" />
                    ) : result.severity === 'warning' ? (
                      <AlertTriangle className="w-4 h-4 text-accent-amber flex-shrink-0 mt-0.5" />
                    ) : (
                      <Activity className="w-4 h-4 text-text-muted flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-text-primary truncate">{result.message}</div>
                      {result.suggestion && (
                        <div className="text-xs text-text-muted mt-0.5">{result.suggestion}</div>
                      )}
                    </div>
                  </div>
                ))}
                {filteredResults.length > 15 && (
                  <div className="px-4 py-2 text-xs text-text-muted text-center">
                    +{filteredResults.length - 15} more results
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Browser Features Summary */}
          <div className="px-4 py-3 border-t border-border bg-surface-elevated">
            <div className="flex items-center justify-between text-xs text-text-muted">
              <span>Browser Features</span>
              <div className="flex items-center gap-1">
                {browserFeatures.localStorage && <Database className="w-3 h-3 text-accent-green" />}
                {browserFeatures.webAnimations && <Monitor className="w-3 h-3 text-accent-green" />}
                {browserFeatures.intersectionObserver && <Cpu className="w-3 h-3 text-accent-green" />}
              </div>
            </div>
          </div>
          
          {/* Footer */}
          <div className="px-4 py-2 border-t border-border text-xs text-text-muted text-center">
            Last check: {lastValidation ? new Date(lastValidation).toLocaleTimeString() : 'Never'}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// QUICK STATUS BADGE
// ============================================================================

interface DemoStatusBadgeProps {
  className?: string;
}

export function DemoStatusBadge({ className = '' }: DemoStatusBadgeProps) {
  // v204d-b6: Use individual selector instead of destructuring from store()
  const isDemoMode = useDemoStore((s) => s.isDemoMode);
  const { overallHealth } = usePOCValidation();
  const demoHealth = useDemoHealthMonitor();
  
  if (!isDemoMode) return null;
  
  const combinedHealth = overallHealth === 'error' || demoHealth.status === 'error' 
    ? 'error' 
    : overallHealth === 'warning' || demoHealth.status === 'degraded'
    ? 'warning'
    : 'healthy';
  
  const colors = {
    healthy: 'bg-accent-green',
    warning: 'bg-accent-amber',
    error: 'bg-accent-red',
  };
  
  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <div className={`w-2 h-2 rounded-full ${colors[combinedHealth]} ${combinedHealth === 'healthy' ? '' : 'animate-pulse'}`} />
      <span className="text-xs text-text-muted capitalize">{combinedHealth}</span>
    </div>
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export default DemoHealthMonitor;
