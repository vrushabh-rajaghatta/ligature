

import { useState, useCallback } from 'react';
import {
  Wand2, Sparkles, Target, RefreshCw, Check, X, ChevronRight, ChevronDown,
  Zap, FileText, Brain, TrendingUp, AlertTriangle, CheckCircle, Clock,
  Play, Pause, RotateCcw, Copy, ArrowRight, Lightbulb, Award, Layers
} from 'lucide-react';
import {
  useResponseIntelligence,
  useSelectedDraft,
  useDraftsForQuestion,
  useTemplateCandidates,
  usePendingSuggestions,
  useCoachingSession,
  useGenerationStatus,
  type GeneratedDraft,
  type TemplateCandidate,
  type RefinementSuggestion,
  type CoachingSession,
  type CoachingGuidance,
} from '@/store/useResponseIntelligence';

// ============================================================================
// TYPES
// ============================================================================

type IntelligenceTab = 'generate' | 'templates' | 'refine' | 'coach';

interface ResponseIntelligencePanelProps {
  questionId: string;
  currentResponse?: string;
  onApplyDraft?: (content: string) => void;
  onContentChange?: (content: string) => void;
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function ProgressRing({ progress, size = 48 }: { progress: number; size?: number }) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;
  
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle cx={size/2} cy={size/2} r={radius} stroke="currentColor" strokeWidth="4" fill="none" className="text-surface-elevated" />
        <circle cx={size/2} cy={size/2} r={radius} stroke="currentColor" strokeWidth="4" fill="none" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className="text-accent-blue transition-all duration-300" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-semibold">{progress}%</span>
      </div>
    </div>
  );
}

function ScoreBadge({ score, label }: { score: number; label?: string }) {
  const getColor = (s: number) => {
    if (s >= 80) return 'bg-accent-green/20 text-accent-green';
    if (s >= 60) return 'bg-accent-amber/20 text-accent-amber';
    return 'bg-accent-red/20 text-accent-red';
  };
  
  return (
    <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full ${getColor(score)}`}>
      <span className="font-bold text-sm">{score}</span>
      {label && <span className="text-xs opacity-80">{label}</span>}
    </div>
  );
}

function PriorityBadge({ priority }: { priority: RefinementSuggestion['priority'] }) {
  const config = {
    critical: { bg: 'bg-accent-red/20', text: 'text-accent-red', label: 'Critical' },
    high: { bg: 'bg-accent-amber/20', text: 'text-accent-amber', label: 'High' },
    medium: { bg: 'bg-accent-blue/20', text: 'text-accent-blue', label: 'Medium' },
    low: { bg: 'bg-surface-elevated', text: 'text-text-secondary', label: 'Low' }
  };
  const { bg, text, label } = config[priority];
  return <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${bg} ${text}`}>{label}</span>;
}

function GuidanceCard({ guidance, onAction }: { guidance: CoachingGuidance; onAction?: () => void }) {
  const iconConfig = {
    tip: { icon: Lightbulb, color: 'text-accent-blue' },
    warning: { icon: AlertTriangle, color: 'text-accent-amber' },
    suggestion: { icon: Sparkles, color: 'text-accent-purple' },
    requirement: { icon: Target, color: 'text-accent-red' }
  };
  const { icon: Icon, color } = iconConfig[guidance.type];
  
  return (
    <div className="p-3 rounded-lg bg-surface-elevated border border-border">
      <div className="flex items-start gap-2">
        <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${color}`} />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium">{guidance.message}</div>
          {guidance.details && <div className="text-xs text-text-secondary mt-1">{guidance.details}</div>}
          {guidance.actionable && guidance.action && onAction && (
            <button onClick={onAction} className="mt-2 text-xs text-accent-blue hover:underline flex items-center gap-1">
              {guidance.action} <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// TAB: GENERATE
// ============================================================================

function GenerateTab({ questionId, onApplyDraft }: { questionId: string; onApplyDraft?: (content: string) => void }) {
  const { quickGenerate, applyDraft, deleteDraft, selectDraft } = useResponseIntelligence();
  const drafts = useDraftsForQuestion(questionId);
  const selectedDraft = useSelectedDraft();
  const { isGenerating, progress, error } = useGenerationStatus();
  const [expandedDraftId, setExpandedDraftId] = useState<string | null>(null);
  
  const handleGenerate = useCallback(async () => {
    try {
      const draft = await quickGenerate(questionId);
      selectDraft(draft.id);
      setExpandedDraftId(draft.id);
    } catch (err) {
      console.error('Generation failed:', err);
    }
  }, [questionId, quickGenerate, selectDraft]);
  
  const handleApply = useCallback((draft: GeneratedDraft) => {
    applyDraft(draft.id);
    onApplyDraft?.(draft.content);
  }, [applyDraft, onApplyDraft]);
  
  return (
    <div className="space-y-4">
      {/* Generate Button */}
      <div className="bg-gradient-to-r from-accent-blue/10 to-accent-purple/10 rounded-xl p-4 border border-accent-blue/20">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold flex items-center gap-2">
              <Wand2 className="w-5 h-5 text-accent-blue" />
              AI Draft Generator
            </h3>
            <p className="text-sm text-text-secondary mt-1">
              Generate a response draft based on templates and patterns
            </p>
          </div>
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="px-4 py-2 bg-accent-blue text-white rounded-lg font-medium hover:bg-accent-blue/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Generate Draft
              </>
            )}
          </button>
        </div>
        
        {isGenerating && (
          <div className="mt-4">
            <div className="flex items-center gap-3">
              <ProgressRing progress={progress} size={40} />
              <div className="flex-1">
                <div className="h-2 bg-surface rounded-full overflow-hidden">
                  <div className="h-full bg-accent-blue transition-all duration-300" style={{ width: `${progress}%` }} />
                </div>
                <div className="text-xs text-text-secondary mt-1">
                  {progress < 30 ? 'Analyzing question...' : progress < 60 ? 'Selecting template...' : progress < 90 ? 'Generating content...' : 'Finalizing...'}
                </div>
              </div>
            </div>
          </div>
        )}
        
        {error && (
          <div className="mt-3 p-2 bg-accent-red/10 border border-accent-red/20 rounded-lg text-sm text-accent-red">
            {error}
          </div>
        )}
      </div>
      
      {/* Generated Drafts */}
      {drafts.length > 0 && (
        <div className="space-y-3">
          <div className="text-sm font-medium text-text-secondary">Generated Drafts ({drafts.length})</div>
          {drafts.map(draft => (
            <div key={draft.id} className={`rounded-xl border transition-colors ${selectedDraft?.id === draft.id ? 'border-accent-blue bg-accent-blue/5' : 'border-border bg-surface-elevated'}`}>
              <button
                onClick={() => { selectDraft(draft.id); setExpandedDraftId(expandedDraftId === draft.id ? null : draft.id); }}
                className="w-full p-3 flex items-center gap-3 text-left"
              >
                <div className={`p-2 rounded-lg ${draft.status === 'applied' ? 'bg-accent-green/20' : 'bg-surface'}`}>
                  <FileText className={`w-4 h-4 ${draft.status === 'applied' ? 'text-accent-green' : 'text-text-secondary'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate">
                      {draft.templateAttribution.primaryTemplateName || 'Pattern-based Draft'}
                    </span>
                    {draft.status === 'applied' && <CheckCircle className="w-4 h-4 text-accent-green" />}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-text-secondary">
                    <span>{new Date(draft.generatedAt).toLocaleTimeString()}</span>
                    <ScoreBadge score={draft.initialScore.overall} />
                    <span>{draft.generationTimeMs}ms</span>
                  </div>
                </div>
                {expandedDraftId === draft.id ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
              
              {expandedDraftId === draft.id && (
                <div className="px-3 pb-3 space-y-3">
                  {/* Score Summary */}
                  <div className="grid grid-cols-5 gap-2">
                    {Object.entries(draft.initialScore.dimensions).map(([key, dim]) => (
                      <div key={key} className="text-center p-2 rounded bg-surface">
                        <div className="text-lg font-bold">{dim.score}</div>
                        <div className="text-[10px] text-text-secondary capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Preview */}
                  <div className="p-3 rounded-lg bg-surface max-h-48 overflow-y-auto">
                    <pre className="text-xs whitespace-pre-wrap font-mono">{draft.content.slice(0, 500)}...</pre>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleApply(draft)}
                      disabled={draft.status === 'applied'}
                      className="flex-1 py-2 bg-accent-blue text-white rounded-lg text-sm font-medium hover:bg-accent-blue/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {draft.status === 'applied' ? <><Check className="w-4 h-4" /> Applied</> : <><ArrowRight className="w-4 h-4" /> Apply to Response</>}
                    </button>
                    <button onClick={() => navigator.clipboard.writeText(draft.content)} className="p-2 rounded-lg bg-surface hover:bg-surface-hover" title="Copy">
                      <Copy className="w-4 h-4" />
                    </button>
                    <button onClick={() => deleteDraft(draft.id)} className="p-2 rounded-lg bg-surface hover:bg-accent-red/10 text-text-secondary hover:text-accent-red" title="Delete">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      
      {drafts.length === 0 && !isGenerating && (
        <div className="text-center py-8 text-text-secondary">
          <Wand2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No drafts generated yet</p>
          <p className="text-xs mt-1">Click "Generate Draft" to create an AI-powered response</p>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// TAB: TEMPLATES
// ============================================================================

function TemplatesTab({ questionId }: { questionId: string }) {
  const { getTemplateCandidates, refreshTemplateAnalysis } = useResponseIntelligence();
  const candidates = useTemplateCandidates(questionId);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  // Load candidates if not cached
  if (candidates.length === 0) {
    getTemplateCandidates(questionId);
  }
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">Template Candidates</div>
        <button onClick={() => refreshTemplateAnalysis(questionId)} className="p-1.5 rounded hover:bg-surface-elevated" title="Refresh">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>
      
      {candidates.length > 0 ? (
        <div className="space-y-2">
          {candidates.slice(0, 10).map(candidate => (
            <div key={candidate.template.id} className={`rounded-lg border ${candidate.recommended ? 'border-accent-blue bg-accent-blue/5' : 'border-border bg-surface-elevated'}`}>
              <button
                onClick={() => setExpandedId(expandedId === candidate.template.id ? null : candidate.template.id)}
                className="w-full p-3 flex items-center gap-3 text-left"
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-text-secondary">#{candidate.rank}</span>
                  {candidate.recommended && <Award className="w-4 h-4 text-accent-amber" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{candidate.template.name}</div>
                  <div className="text-xs text-text-secondary mt-0.5">{candidate.template.description.slice(0, 60)}...</div>
                </div>
                <ScoreBadge score={candidate.matchScore} label="match" />
                {expandedId === candidate.template.id ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
              
              {expandedId === candidate.template.id && (
                <div className="px-3 pb-3 space-y-3">
                  {/* Match Reasons */}
                  <div className="space-y-1.5">
                    {candidate.matchReasons.map((reason, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs">
                        <div className="w-24 text-text-secondary">{reason.factor}</div>
                        <div className="flex-1 h-1.5 bg-surface rounded-full overflow-hidden">
                          <div className={`h-full ${reason.score >= 70 ? 'bg-accent-green' : reason.score >= 40 ? 'bg-accent-amber' : 'bg-accent-red'}`} style={{ width: `${reason.score}%` }} />
                        </div>
                        <div className="w-8 text-right">{reason.score}</div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Coverage */}
                  <div className="p-2 rounded bg-surface">
                    <div className="text-xs font-medium mb-1">Gap Coverage: {candidate.coverageAnalysis.coveragePercent}%</div>
                    <div className="flex flex-wrap gap-1">
                      {candidate.coverageAnalysis.elementsAddressed.map(elem => (
                        <span key={elem} className="px-1.5 py-0.5 rounded text-[10px] bg-accent-green/20 text-accent-green">{elem.replace(/-/g, ' ')}</span>
                      ))}
                      {candidate.coverageAnalysis.elementsMissing.slice(0, 3).map(elem => (
                        <span key={elem} className="px-1.5 py-0.5 rounded text-[10px] bg-accent-red/20 text-accent-red">{elem.replace(/-/g, ' ')}</span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-text-secondary">
          <Layers className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Analyzing templates...</p>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// TAB: REFINE
// ============================================================================

function RefineTab({ questionId }: { questionId: string }) {
  const { applyChange, dismissSuggestion, applyAllSuggestions } = useResponseIntelligence();
  const selectedDraft = useSelectedDraft();
  const suggestions = usePendingSuggestions(selectedDraft?.id || '');
  
  if (!selectedDraft) {
    return (
      <div className="text-center py-8 text-text-secondary">
        <Target className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p className="text-sm">No draft selected</p>
        <p className="text-xs mt-1">Generate a draft first to see refinement suggestions</p>
      </div>
    );
  }
  
  const criticalCount = suggestions.filter(s => s.priority === 'critical').length;
  const highCount = suggestions.filter(s => s.priority === 'high').length;
  
  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="bg-surface-elevated rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="font-medium">Refinement Suggestions</div>
          {suggestions.length > 0 && (
            <button
              onClick={() => applyAllSuggestions(selectedDraft.id)}
              className="text-xs text-accent-blue hover:underline flex items-center gap-1"
            >
              <Zap className="w-3 h-3" /> Apply All Auto
            </button>
          )}
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold">{suggestions.length}</span>
            <span className="text-sm text-text-secondary">suggestions</span>
          </div>
          {criticalCount > 0 && <span className="px-2 py-0.5 rounded-full text-xs bg-accent-red/20 text-accent-red">{criticalCount} critical</span>}
          {highCount > 0 && <span className="px-2 py-0.5 rounded-full text-xs bg-accent-amber/20 text-accent-amber">{highCount} high</span>}
        </div>
      </div>
      
      {/* Suggestions List */}
      {suggestions.length > 0 ? (
        <div className="space-y-2">
          {suggestions.map(suggestion => (
            <div key={suggestion.id} className="p-3 rounded-lg bg-surface-elevated border border-border">
              <div className="flex items-start gap-2">
                <PriorityBadge priority={suggestion.priority} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm">{suggestion.suggestion}</div>
                  <div className="text-xs text-text-secondary mt-1">{suggestion.rationale}</div>
                  {suggestion.targetElement && (
                    <div className="mt-2">
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-surface">{suggestion.targetElement.replace(/-/g, ' ')}</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-accent-green">+{suggestion.expectedScoreImprovement}</span>
                  {suggestion.canAutoApply && (
                    <button
                      onClick={() => applyChange(selectedDraft.id, {
                        id: `change-${Date.now()}`, type: 'addition', target: 'section',
                        newContent: suggestion.autoApplyContent, reason: suggestion.suggestion,
                        addressesGap: suggestion.targetElement, expectedImpact: [], applied: true
                      })}
                      className="p-1 rounded hover:bg-accent-blue/20 text-accent-blue"
                      title="Apply"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                  <button onClick={() => dismissSuggestion(selectedDraft.id, suggestion.id)} className="p-1 rounded hover:bg-surface" title="Dismiss">
                    <X className="w-4 h-4 text-text-secondary" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-text-secondary">
          <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-30 text-accent-green" />
          <p className="text-sm">No pending suggestions</p>
          <p className="text-xs mt-1">The draft looks good!</p>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// TAB: COACH
// ============================================================================

function CoachTab({ questionId, currentResponse, onContentChange }: { questionId: string; currentResponse?: string; onContentChange?: (content: string) => void }) {
  const { startCoachingSession, updateCoachingContent, endCoachingSession } = useResponseIntelligence();
  const session = useCoachingSession(questionId);
  
  const handleStartSession = useCallback(() => {
    startCoachingSession(questionId, currentResponse || '');
  }, [questionId, currentResponse, startCoachingSession]);
  
  const handleContentUpdate = useCallback((content: string) => {
    if (session) {
      updateCoachingContent(session.id, content);
      onContentChange?.(content);
    }
  }, [session, updateCoachingContent, onContentChange]);
  
  if (!session) {
    return (
      <div className="space-y-4">
        <div className="bg-gradient-to-r from-accent-purple/10 to-accent-blue/10 rounded-xl p-6 text-center border border-accent-purple/20">
          <Brain className="w-12 h-12 mx-auto mb-3 text-accent-purple" />
          <h3 className="font-semibold mb-2">Response Quality Coach</h3>
          <p className="text-sm text-text-secondary mb-4">
            Get real-time guidance as you write your response. The coach analyzes your content and provides suggestions to improve quality.
          </p>
          <button onClick={handleStartSession} className="px-4 py-2 bg-accent-purple text-white rounded-lg font-medium hover:bg-accent-purple/90 flex items-center gap-2 mx-auto">
            <Play className="w-4 h-4" /> Start Coaching Session
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      {/* Progress */}
      <div className="bg-surface-elevated rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="font-medium">Session Progress</div>
          <button onClick={() => endCoachingSession(session.id)} className="text-xs text-text-secondary hover:text-accent-red flex items-center gap-1">
            <Pause className="w-3 h-3" /> End Session
          </button>
        </div>
        <div className="flex items-center gap-4">
          <ProgressRing progress={session.progressPercent} size={64} />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl font-bold">{session.currentScoreValue}</span>
              <span className="text-text-secondary">/</span>
              <span className="text-lg text-text-secondary">{session.targetScore}</span>
            </div>
            <div className="text-xs text-text-secondary">
              {session.currentScoreValue >= session.targetScore ? (
                <span className="text-accent-green">Target reached!</span>
              ) : (
                <span>{session.targetScore - session.currentScoreValue} points to target</span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-2 text-xs text-text-secondary">
              <span className="flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                +{session.currentScoreValue - session.initialScore} from start
              </span>
              <span>{session.interactionCount} edits</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Guidance */}
      {session.currentGuidance.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm font-medium">Current Guidance</div>
          {session.currentGuidance.map(guidance => (
            <GuidanceCard key={guidance.id} guidance={guidance} />
          ))}
        </div>
      )}
      
      {/* Score Dimensions */}
      <div className="bg-surface-elevated rounded-xl p-4">
        <div className="text-sm font-medium mb-3">Score Breakdown</div>
        <div className="space-y-2">
          {Object.entries(session.currentScore.dimensions).map(([key, dim]) => (
            <div key={key} className="flex items-center gap-2">
              <span className="text-xs text-text-secondary w-28 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
              <div className="flex-1 h-2 bg-surface rounded-full overflow-hidden">
                <div className={`h-full transition-all duration-300 ${dim.score >= 70 ? 'bg-accent-green' : dim.score >= 50 ? 'bg-accent-amber' : 'bg-accent-red'}`} style={{ width: `${dim.score}%` }} />
              </div>
              <span className="text-xs w-8 text-right font-medium">{dim.score}</span>
            </div>
          ))}
        </div>
      </div>
      
      {/* Quick Actions */}
      {session.activeSuggestions.length > 0 && (
        <div className="bg-surface-elevated rounded-xl p-4">
          <div className="text-sm font-medium mb-2">Quick Improvements</div>
          <div className="space-y-2">
            {session.activeSuggestions.slice(0, 3).map(suggestion => (
              <button key={suggestion.id} className="w-full p-2 rounded-lg bg-surface hover:bg-surface-hover text-left flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-accent-amber shrink-0" />
                <span className="text-xs flex-1">{suggestion.suggestion}</span>
                <span className="text-xs text-accent-green">+{suggestion.expectedScoreImprovement}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ResponseIntelligencePanel({ questionId, currentResponse, onApplyDraft, onContentChange }: ResponseIntelligencePanelProps) {
  const [activeTab, setActiveTab] = useState<IntelligenceTab>('generate');
  
  const tabs: { id: IntelligenceTab; label: string; icon: React.ReactNode }[] = [
    { id: 'generate', label: 'Generate', icon: <Wand2 className="w-4 h-4" /> },
    { id: 'templates', label: 'Templates', icon: <Layers className="w-4 h-4" /> },
    { id: 'refine', label: 'Refine', icon: <Target className="w-4 h-4" /> },
    { id: 'coach', label: 'Coach', icon: <Brain className="w-4 h-4" /> },
  ];

  return (
    <div className="flex flex-col h-full bg-surface rounded-xl border border-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-surface-elevated">
        <Sparkles className="w-5 h-5 text-accent-purple" />
        <span className="font-semibold">Response Intelligence</span>
      </div>
      
      {/* Tabs */}
      <div className="flex border-b border-border bg-surface-elevated">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm transition-colors ${
              activeTab === tab.id
                ? 'text-accent-purple border-b-2 border-accent-purple -mb-px'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'generate' && <GenerateTab questionId={questionId} onApplyDraft={onApplyDraft} />}
        {activeTab === 'templates' && <TemplatesTab questionId={questionId} />}
        {activeTab === 'refine' && <RefineTab questionId={questionId} />}
        {activeTab === 'coach' && <CoachTab questionId={questionId} currentResponse={currentResponse} onContentChange={onContentChange} />}
      </div>
    </div>
  );
}

export default ResponseIntelligencePanel;
