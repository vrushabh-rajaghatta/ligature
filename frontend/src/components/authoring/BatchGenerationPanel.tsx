

/**
 * BatchGenerationPanel - v0.27.69
 * 
 * Unified visual feedback for multi-section AI generation:
 * - Queue of sections with status indicators
 * - Current section streaming with progress
 * - Overall batch progress and metrics
 * - Pause/resume/cancel controls
 * - Results summary on completion
 * 
 * "Generate all six Module 2.7 sections in sequence — watch Claude work"
 */

import { useState, useEffect, useRef } from 'react';
import {
  Sparkles, X, Copy, Check, StopCircle, Play, Pause,
  Clock, Zap, FileText, AlertCircle, 
  CheckCircle2, Brain, Loader2, ChevronRight,
  Shield, ArrowRight, ThumbsUp, SkipForward,
  Layers, ListOrdered, Timer, TrendingUp
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  useBatchSectionGeneration,
  type BatchSection,
  type BatchGenerationContext,
  type SectionProgress,
  MODULE_27_SECTIONS,
  CLINICAL_OVERVIEW_SECTIONS,
} from '@/hooks/useBatchSectionGeneration';
import { formatAsAMAContent, AMA_CONTENT_STYLES, StreamingCursor } from '@/utils/ama-formatter';

// =============================================================================
// TYPES
// =============================================================================

interface BatchGenerationPanelProps {
  /** Preset section batch or custom sections */
  sections?: BatchSection[];
  /** Document type for API generation */
  documentType?: string;
  /** Preset type for quick selection */
  preset?: 'module-27' | 'clinical-overview' | 'custom';
  /** Display name for the preset */
  presetName?: string;
  /** Generation context */
  context: BatchGenerationContext;
  /** Callback when batch completes */
  onComplete?: (results: Array<{ sectionId: string; content: string; complianceScore: number }>) => void;
  /** Callback when panel is closed */
  onClose?: () => void;
  /** Whether to auto-start on mount */
  autoStart?: boolean;
}

// =============================================================================
// SECTION QUEUE ITEM
// =============================================================================

function SectionQueueItem({ 
  sectionProgress, 
  isActive,
  index,
}: { 
  sectionProgress: SectionProgress; 
  isActive: boolean;
  index: number;
}) {
  const { section, status, progress, wordCount, complianceScore } = sectionProgress;
  
  const statusIcons = {
    pending: <Clock className="w-3.5 h-3.5 text-text-muted" />,
    generating: <Loader2 className="w-3.5 h-3.5 text-accent-purple animate-spin" />,
    complete: <CheckCircle2 className="w-3.5 h-3.5 text-accent-green" />,
    error: <AlertCircle className="w-3.5 h-3.5 text-accent-red" />,
    skipped: <SkipForward className="w-3.5 h-3.5 text-text-muted" />,
  };
  
  const statusColors = {
    pending: 'bg-surface-card border-border',
    generating: 'bg-accent-purple/10 border-accent-purple/30',
    complete: 'bg-accent-green/10 border-accent-green/30',
    error: 'bg-accent-red/10 border-accent-red/30',
    skipped: 'bg-surface-card border-border opacity-50',
  };

  return (
    <div className={`flex items-center gap-3 px-3 py-2 rounded-lg border transition-all ${statusColors[status]} ${isActive ? 'ring-1 ring-accent-purple/50' : ''}`}>
      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-surface-elevated text-xs font-mono text-text-muted">
        {index + 1}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-accent-blue">{section.number}</span>
          <span className="text-sm text-text-primary truncate">{section.title}</span>
        </div>
        
        {status === 'generating' && (
          <div className="mt-1 flex items-center gap-2">
            <div className="flex-1 h-1 bg-surface-card rounded-full overflow-hidden">
              <div 
                className="h-full bg-accent-purple transition-all duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-xs text-text-muted font-mono">{progress}%</span>
          </div>
        )}
        
        {status === 'complete' && (
          <div className="mt-1 flex items-center gap-3 text-xs text-text-muted">
            <span>{wordCount} words</span>
            <span className={`font-semibold ${
              complianceScore && complianceScore >= 85 ? 'text-accent-green' :
              complianceScore && complianceScore >= 70 ? 'text-accent-amber' :
              'text-text-muted'
            }`}>
              {complianceScore}%
            </span>
          </div>
        )}
      </div>
      
      {statusIcons[status]}
    </div>
  );
}

// =============================================================================
// BATCH METRICS DISPLAY
// =============================================================================

function BatchMetricsDisplay({
  totalSections,
  completedSections,
  totalWords,
  totalTimeMs,
  averageComplianceScore,
  estimatedRemainingMs,
  isRunning,
}: {
  totalSections: number;
  completedSections: number;
  totalWords: number;
  totalTimeMs: number;
  averageComplianceScore: number;
  estimatedRemainingMs: number;
  isRunning: boolean;
}) {
  return (
    <div className="grid grid-cols-4 gap-4 text-center">
      <div className="bg-surface-card rounded-lg p-3">
        <div className="flex items-center justify-center gap-1 text-text-muted mb-1">
          <Layers className="w-3.5 h-3.5" />
          <span className="text-xs">Progress</span>
        </div>
        <div className="text-lg font-semibold text-text-primary">
          {completedSections}/{totalSections}
        </div>
        <div className="h-1 mt-2 bg-surface rounded-full overflow-hidden">
          <div 
            className="h-full bg-accent-purple transition-all"
            style={{ width: `${(completedSections / totalSections) * 100}%` }}
          />
        </div>
      </div>
      
      <div className="bg-surface-card rounded-lg p-3">
        <div className="flex items-center justify-center gap-1 text-text-muted mb-1">
          <FileText className="w-3.5 h-3.5" />
          <span className="text-xs">Words</span>
        </div>
        <div className="text-lg font-semibold text-text-primary">
          {totalWords.toLocaleString()}
        </div>
      </div>
      
      <div className="bg-surface-card rounded-lg p-3">
        <div className="flex items-center justify-center gap-1 text-text-muted mb-1">
          <Shield className="w-3.5 h-3.5" />
          <span className="text-xs">Avg Score</span>
        </div>
        <div className={`text-lg font-semibold ${
          averageComplianceScore >= 85 ? 'text-accent-green' :
          averageComplianceScore >= 70 ? 'text-accent-amber' :
          'text-text-primary'
        }`}>
          {averageComplianceScore > 0 ? `${averageComplianceScore}%` : '—'}
        </div>
      </div>
      
      <div className="bg-surface-card rounded-lg p-3">
        <div className="flex items-center justify-center gap-1 text-text-muted mb-1">
          <Timer className="w-3.5 h-3.5" />
          <span className="text-xs">{isRunning ? 'ETA' : 'Time'}</span>
        </div>
        <div className="text-lg font-semibold text-text-primary font-mono">
          {isRunning && estimatedRemainingMs > 0 
            ? `${Math.ceil(estimatedRemainingMs / 1000)}s`
            : `${(totalTimeMs / 1000).toFixed(1)}s`
          }
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function BatchGenerationPanel({
  sections: customSections,
  documentType = 'csr',
  preset = 'module-27',
  presetName,
  context,
  onComplete,
  onClose,
  autoStart = false,
}: BatchGenerationPanelProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [showCursor, setShowCursor] = useState(true);
  const [selectedPreset, setSelectedPreset] = useState(preset);
  
  // Get sections based on preset or custom - prefer custom sections if provided
  const sections = customSections && customSections.length > 0 
    ? customSections 
    : (
      selectedPreset === 'module-27' ? MODULE_27_SECTIONS :
      selectedPreset === 'clinical-overview' ? CLINICAL_OVERVIEW_SECTIONS :
      []
    );
  
  // Display name for the document being generated
  const displayName = presetName || (
    selectedPreset === 'module-27' ? 'Module 2.7 Clinical Summary' :
    selectedPreset === 'clinical-overview' ? 'Clinical Overview' :
    'Document Sections'
  );
  
  const {
    state,
    metrics,
    startBatch,
    pause,
    resume,
    cancel,
    reset,
    skipCurrent,
    getResults,
    isRunning,
    isPaused,
    isComplete,
    isError,
    isIdle,
  } = useBatchSectionGeneration({
    // v0.44.9: onComplete now only fires on explicit Accept All click (see handleAcceptAll)
    // Removed auto-fire here so users always review results before content is applied
    documentType: documentType,
    useRealAPI: !!documentType && !documentType.includes('module-27'),
  });

  // Auto-start if requested
  useEffect(() => {
    if (autoStart && isIdle && sections.length > 0) {
      startBatch(sections, context);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart]);

  // Cursor blink effect
  useEffect(() => {
    if (isRunning) {
      const interval = setInterval(() => {
        setShowCursor(prev => !prev);
      }, 530);
      return () => clearInterval(interval);
    }
    setShowCursor(true);
  }, [isRunning]);

  // Auto-scroll current section content
  useEffect(() => {
    if (contentRef.current && isRunning) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [state.sections, isRunning]);

  const currentSection = state.currentSectionIndex >= 0 
    ? state.sections[state.currentSectionIndex] 
    : null;

  const handleStart = () => {
    startBatch(sections, context);
  };

  const handleAcceptAll = () => {
    const results = getResults();
    onComplete?.(results.map(r => ({
      sectionId: r.sectionId,
      content: r.content,
      complianceScore: r.complianceScore,
    })));
    onClose?.();
  };

  return (
    <div className="bg-surface border border-border rounded-xl overflow-hidden flex flex-col max-h-[85vh]">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border bg-surface-elevated flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${
            isRunning ? 'bg-accent-purple/20' : 
            isComplete ? 'bg-accent-green/20' : 
            isPaused ? 'bg-accent-amber/20' :
            isError ? 'bg-accent-red/20' : 
            'bg-surface-card'
          }`}>
            {isRunning ? (
              <Sparkles className="w-5 h-5 text-accent-purple animate-pulse" />
            ) : isComplete ? (
              <CheckCircle2 className="w-5 h-5 text-accent-green" />
            ) : isPaused ? (
              <Pause className="w-5 h-5 text-accent-amber" />
            ) : isError ? (
              <AlertCircle className="w-5 h-5 text-accent-red" />
            ) : (
              <Layers className="w-5 h-5 text-text-muted" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-text-primary">
                Batch Section Generation
              </h3>
              <Badge className="bg-accent-purple/20 text-accent-purple border-0 text-xs">
                {sections.length} sections
              </Badge>
            </div>
            <p className="text-xs text-text-muted mt-0.5">
              {context.productName} • {displayName}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {isRunning && (
            <Button variant="ghost" size="sm" onClick={pause}>
              <Pause className="w-4 h-4 mr-1" />
              Pause
            </Button>
          )}
          {isPaused && (
            <Button variant="ghost" size="sm" onClick={resume}>
              <Play className="w-4 h-4 mr-1" />
              Resume
            </Button>
          )}
          {(isRunning || isPaused) && (
            <>
              <Button variant="ghost" size="sm" onClick={skipCurrent}>
                <SkipForward className="w-4 h-4 mr-1" />
                Skip
              </Button>
              <Button variant="ghost" size="sm" onClick={cancel}>
                <StopCircle className="w-4 h-4 mr-1" />
                Cancel
              </Button>
            </>
          )}
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
      
      {/* Metrics */}
      <div className="px-4 py-3 border-b border-border bg-surface-card/30">
        <BatchMetricsDisplay
          {...metrics}
          isRunning={isRunning}
        />
      </div>
      
      {/* Main Content Area */}
      <div className="flex-1 flex min-h-0">
        {/* Section Queue (left sidebar) */}
        <div className="hidden lg:block w-80 border-r border-border bg-surface-elevated p-3 overflow-y-auto">
          <div className="flex items-center gap-2 mb-3 text-xs text-text-muted">
            <ListOrdered className="w-3.5 h-3.5" />
            <span>Section Queue</span>
          </div>
          <div className="space-y-2">
            {state.sections.length > 0 ? (
              (state.sections ?? []).map((sp, i) => (
                <SectionQueueItem
                  key={sp.section.id}
                  sectionProgress={sp}
                  isActive={i === state.currentSectionIndex}
                  index={i}
                />
              ))
            ) : (
              sections.map((section, i) => (
                <div 
                  key={section.id}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg bg-surface-card border border-border"
                >
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-surface-elevated text-xs font-mono text-text-muted">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-accent-blue">{section.number}</span>
                      <span className="text-sm text-text-primary truncate">{section.title}</span>
                    </div>
                    <div className="text-xs text-text-muted mt-0.5">
                      ~{section.estimatedWords?.toLocaleString()} words
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        
        {/* Current Section Content (main area) */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Current section header */}
          {currentSection && (
            <div className="px-4 py-2 border-b border-border bg-accent-purple/5">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-accent-purple" />
                <span className="text-xs font-medium text-accent-purple">Now Generating:</span>
                <span className="text-sm font-semibold text-text-primary">
                  {currentSection.section.number} {currentSection.section.title}
                </span>
              </div>
            </div>
          )}
          
          {/* Content area - AMA regulatory document styling */}
          <div 
            ref={contentRef}
            className="flex-1 overflow-y-auto p-6 bg-white"
            style={{
              fontFamily: '"Times New Roman", Times, Georgia, serif',
              fontSize: '12pt',
              lineHeight: '1.6',
              color: '#1a1a1a',
            }}
          >
            {isIdle && (
              <div className="flex flex-col items-center justify-center h-full text-center" style={{ fontFamily: 'system-ui, sans-serif' }}>
                <Layers className="w-12 h-12 text-text-muted mb-4" />
                <h3 className="text-lg font-semibold text-text-primary mb-2">
                  Ready to Generate
                </h3>
                <p className="text-sm text-text-muted mb-6 max-w-md">
                  Generate all {sections.length} sections of {displayName} in sequence. 
                  Each section will be drafted with appropriate CTD structure and terminology.
                </p>
                <Button variant="primary" onClick={handleStart}>
                  <Play className="w-4 h-4 mr-2" />
                  Start Batch Generation
                </Button>
              </div>
            )}
            
            {(isRunning || isPaused) && currentSection && (
              <div 
                className="regulatory-content"
                style={{ textAlign: 'justify' }}
                dangerouslySetInnerHTML={{ 
                  __html: formatAsAMAContent(currentSection.content) 
                }}
              />
            )}
            {(isRunning || isPaused) && currentSection && isRunning && showCursor && <StreamingCursor />}
            
            {isComplete && (
              <div className="space-y-6">
                <div className="text-center py-8">
                  <CheckCircle2 className="w-12 h-12 text-accent-green mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-text-primary mb-2">
                    Batch Generation Complete
                  </h3>
                  <p className="text-sm text-text-muted">
                    Successfully generated {metrics.completedSections} sections with {metrics.totalWords.toLocaleString()} total words
                  </p>
                </div>
                
                {/* Results summary */}
                <div className="bg-surface-card rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-text-primary mb-3">Results Summary</h4>
                  <div className="space-y-2">
                    {(state.sections ?? []).filter(s => s.status === 'complete').map(sp => (
                      <div 
                        key={sp.section.id}
                        className="flex items-center justify-between py-2 border-b border-border last:border-0"
                      >
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-accent-green" />
                          <span className="text-sm">
                            <span className="font-mono text-accent-blue">{sp.section.number}</span>
                            {' '}{sp.section.title}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-text-muted">
                          <span>{sp.wordCount} words</span>
                          <span className={`font-semibold ${
                            sp.complianceScore && sp.complianceScore >= 85 ? 'text-accent-green' :
                            sp.complianceScore && sp.complianceScore >= 70 ? 'text-accent-amber' :
                            'text-text-muted'
                          }`}>
                            {sp.complianceScore}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            
            {isError && (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <AlertCircle className="w-12 h-12 text-accent-red mb-4" />
                <h3 className="text-lg font-semibold text-text-primary mb-2">
                  Generation Error
                </h3>
                <p className="text-sm text-text-muted mb-6">
                  {state.error || 'An error occurred during generation'}
                </p>
                <Button variant="secondary" onClick={reset}>
                  Try Again
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Footer */}
      {isComplete && (
        <div className="px-4 py-3 border-t border-border bg-surface-elevated flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-accent-green/20">
              <Shield className="w-4 h-4 text-accent-green" />
              <span className="text-sm font-semibold text-accent-green">
                {metrics.averageComplianceScore}% Average Compliance
              </span>
            </div>
            <span className="text-xs text-text-muted">
              {metrics.completedSections} sections • {metrics.totalWords.toLocaleString()} words • {(metrics.totalTimeMs / 1000).toFixed(1)}s
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={reset}>
              <Sparkles className="w-4 h-4 mr-1" />
              Regenerate All
            </Button>
            <Button variant="primary" size="sm" onClick={handleAcceptAll}>
              <ThumbsUp className="w-4 h-4 mr-1" />
              Accept All Sections
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// EXPORTS
// =============================================================================

export default BatchGenerationPanel;
