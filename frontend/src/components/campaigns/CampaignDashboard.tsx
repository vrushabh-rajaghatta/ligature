

import { useState, useCallback, useMemo } from 'react';
import {
  Layers, CheckCircle, XCircle, AlertTriangle, Clock,
  Target, RefreshCw, ChevronRight, ChevronDown,
  FileText, Zap, Package, Download, ArrowRight,
  Eye, CheckSquare, Square, Sparkles
} from 'lucide-react';
import {
  useResponseCampaign,
  type ResponseCampaign,
  type CampaignRecommendation,
} from '@/store/useResponseCampaign';
import { useHAQStore } from '@/store/useHAQStore';
import type { HAQuestion } from '@/types/haq';

// ============================================================================
// TYPES
// ============================================================================

type CampaignTab = 'overview' | 'questions' | 'quality' | 'consistency' | 'package';

interface CampaignDashboardProps {
  campaignId?: string;
  onSelectQuestion?: (questionId: string) => void;
}

// ============================================================================
// HELPERS
// ============================================================================

function ProgressRing({ progress, size = 48, color = 'blue' }: { progress: number; size?: number; color?: string }) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;
  const colorClass = color === 'green' ? 'text-accent-green' : color === 'amber' ? 'text-accent-amber' : 'text-accent-blue';
  
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle cx={size/2} cy={size/2} r={radius} stroke="currentColor" strokeWidth="4" fill="none" className="text-surface-elevated" />
        <circle cx={size/2} cy={size/2} r={radius} stroke="currentColor" strokeWidth="4" fill="none" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className={`${colorClass} transition-all duration-300`} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-semibold">{progress}%</span>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    draft: { bg: 'bg-surface-elevated', text: 'text-text-secondary', label: 'Draft' },
    configuring: { bg: 'bg-accent-blue/20', text: 'text-accent-blue', label: 'Configuring' },
    generating: { bg: 'bg-accent-purple/20', text: 'text-accent-purple', label: 'Generating' },
    reviewing: { bg: 'bg-accent-amber/20', text: 'text-accent-amber', label: 'Reviewing' },
    ready: { bg: 'bg-accent-green/20', text: 'text-accent-green', label: 'Ready' },
    pending: { bg: 'bg-surface-elevated', text: 'text-text-secondary', label: 'Pending' },
    generated: { bg: 'bg-accent-blue/20', text: 'text-accent-blue', label: 'Generated' },
    approved: { bg: 'bg-accent-green/20', text: 'text-accent-green', label: 'Approved' },
    failed: { bg: 'bg-accent-red/20', text: 'text-accent-red', label: 'Failed' }
  };
  const { bg, text, label } = config[status] || config.draft;
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${bg} ${text}`}>{label}</span>;
}

function ScoreBadge({ score, showLabel = false }: { score: number; showLabel?: boolean }) {
  const getColor = (s: number) => s >= 80 ? 'bg-accent-green/20 text-accent-green' : s >= 60 ? 'bg-accent-amber/20 text-accent-amber' : 'bg-accent-red/20 text-accent-red';
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${getColor(score)}`}>
      {score}{showLabel && <span className="font-normal opacity-80">pts</span>}
    </span>
  );
}

function RecommendationCard({ recommendation }: { recommendation: CampaignRecommendation }) {
  const iconConfig = { quality: { icon: Target, color: 'text-accent-blue' }, consistency: { icon: AlertTriangle, color: 'text-accent-amber' }, efficiency: { icon: Zap, color: 'text-accent-green' }, deadline: { icon: Clock, color: 'text-accent-red' } };
  const { icon: Icon, color } = iconConfig[recommendation.type];
  const priorityColor = recommendation.priority === 'high' ? 'border-accent-red/50' : recommendation.priority === 'medium' ? 'border-accent-amber/50' : 'border-border';
  
  return (
    <div className={`p-3 rounded-lg bg-surface-elevated border-l-4 ${priorityColor}`}>
      <div className="flex items-start gap-2">
        <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${color}`} />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium">{recommendation.title}</div>
          <div className="text-xs text-text-secondary mt-0.5">{recommendation.description}</div>
          {recommendation.estimatedImpact && <div className="mt-1 text-xs text-text-tertiary">Impact: {recommendation.estimatedImpact}</div>}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// TAB: OVERVIEW
// ============================================================================

function OverviewTab({ campaign }: { campaign: ResponseCampaign }) {
  const { getProgressSummary, getRecommendations, generateAllDrafts, runConsistencyCheck, isProcessing, processingProgress, currentTask } = useResponseCampaign();
  
  const progressSummary = useMemo(() => getProgressSummary(campaign.id), [campaign.id, campaign.questionProgress, getProgressSummary]);
  const recommendations = useMemo(() => getRecommendations(campaign.id), [campaign.id, campaign.qualityMetrics, getRecommendations]);
  const metrics = campaign.qualityMetrics;
  
  const handleGenerateAll = useCallback(async () => {
    try { await generateAllDrafts(campaign.id); } catch (err) { console.error('Generation failed:', err); }
  }, [campaign.id, generateAllDrafts]);
  
  const handleRunConsistency = useCallback(async () => {
    try { await runConsistencyCheck(campaign.id); } catch (err) { console.error('Consistency check failed:', err); }
  }, [campaign.id, runConsistencyCheck]);
  
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface-elevated rounded-lg p-4 border border-border">
          <div className="text-xs text-text-secondary mb-2">Overall Progress</div>
          <div className="flex items-center gap-3">
            <ProgressRing progress={progressSummary.overallProgress} size={56} color="blue" />
            <div>
              <div className="text-2xl font-bold">{progressSummary.approvedCount}</div>
              <div className="text-xs text-text-secondary">of {progressSummary.totalQuestions} approved</div>
            </div>
          </div>
        </div>
        <div className="bg-surface-elevated rounded-lg p-4 border border-border">
          <div className="text-xs text-text-secondary mb-2">Quality Score</div>
          <div className="flex items-center gap-3">
            <ProgressRing progress={metrics.overallScore} size={56} color={metrics.overallScore >= 70 ? 'green' : 'amber'} />
            <div>
              <div className="text-2xl font-bold">{metrics.averageScore}</div>
              <div className="text-xs text-text-secondary">avg score</div>
            </div>
          </div>
        </div>
        <div className="bg-surface-elevated rounded-lg p-4 border border-border">
          <div className="text-xs text-text-secondary mb-2">Consistency</div>
          <div className="flex items-center gap-3">
            <ProgressRing progress={metrics.consistencyScore} size={56} color={metrics.consistencyScore >= 80 ? 'green' : 'amber'} />
            <div>
              <div className="text-2xl font-bold">{metrics.consistencyScore}%</div>
              <div className="text-xs text-text-secondary">checks passed</div>
            </div>
          </div>
        </div>
        <div className="bg-surface-elevated rounded-lg p-4 border border-border">
          <div className="text-xs text-text-secondary mb-2">Status</div>
          <div className="space-y-1.5 mt-2">
            <div className="flex justify-between text-xs"><span>Pending</span><span className="font-medium">{progressSummary.pendingCount}</span></div>
            <div className="flex justify-between text-xs"><span>In Review</span><span className="font-medium">{progressSummary.reviewingCount}</span></div>
            <div className="flex justify-between text-xs"><span>Failed</span><span className="font-medium text-accent-red">{progressSummary.failedCount}</span></div>
          </div>
        </div>
      </div>
      
      {isProcessing && (
        <div className="bg-accent-blue/10 border border-accent-blue/30 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <RefreshCw className="w-5 h-5 text-accent-blue animate-spin" />
            <div className="flex-1">
              <div className="text-sm font-medium">{currentTask}</div>
              <div className="mt-2 h-2 bg-surface-elevated rounded-full overflow-hidden">
                <div className="h-full bg-accent-blue transition-all duration-300" style={{ width: `${processingProgress}%` }} />
              </div>
            </div>
            <div className="text-sm font-bold text-accent-blue">{processingProgress}%</div>
          </div>
        </div>
      )}
      
      <div className="flex gap-3">
        <button onClick={handleGenerateAll} disabled={isProcessing || progressSummary.pendingCount === 0} className="flex items-center gap-2 px-4 py-2 bg-accent-blue text-white rounded-lg hover:bg-accent-blue/90 disabled:opacity-50 disabled:cursor-not-allowed">
          <Sparkles className="w-4 h-4" /> Generate All ({progressSummary.pendingCount})
        </button>
        <button onClick={handleRunConsistency} disabled={isProcessing} className="flex items-center gap-2 px-4 py-2 bg-surface-elevated border border-border rounded-lg hover:bg-surface-hover disabled:opacity-50">
          <CheckSquare className="w-4 h-4" /> Check Consistency
        </button>
      </div>
      
      {recommendations.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-3">Recommendations</h3>
          <div className="space-y-2">{recommendations.slice(0, 3).map(rec => <RecommendationCard key={rec.id} recommendation={rec} />)}</div>
        </div>
      )}
      
      <div>
        <h3 className="text-sm font-semibold mb-3">Quality Targets</h3>
        <div className="space-y-2">
          {metrics.targetsDetail.map((target, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 bg-surface-elevated rounded-lg border border-border">
              <div className="flex items-center gap-2">
                {target.met ? <CheckCircle className="w-4 h-4 text-accent-green" /> : <XCircle className="w-4 h-4 text-accent-red" />}
                <span className="text-sm">{target.target}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-text-secondary">Target: {target.targetValue}</span>
                <span className={`text-sm font-bold ${target.met ? 'text-accent-green' : 'text-accent-red'}`}>Current: {target.currentValue}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// TAB: QUESTIONS
// ============================================================================

function QuestionsTab({ campaign, onSelectQuestion }: { campaign: ResponseCampaign; onSelectQuestion?: (id: string) => void }) {
  const haqs = useHAQStore(state => state.haqs);
  const { approveQuestion, regenerateDraft } = useResponseCampaign();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  const questions = useMemo(() => campaign.config.questionIds.map(id => haqs.find(h => h.id === id)).filter(Boolean) as HAQuestion[], [campaign.config.questionIds, haqs]);
  
  const handleToggleSelect = (id: string) => { const s = new Set(selectedIds); if (s.has(id)) s.delete(id); else s.add(id); setSelectedIds(s); };
  const handleSelectAll = () => { if (selectedIds.size === questions.length) setSelectedIds(new Set()); else setSelectedIds(new Set(questions.map(q => q.id))); };
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button onClick={handleSelectAll} className="flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary">
          {selectedIds.size === questions.length ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
          {selectedIds.size > 0 ? `${selectedIds.size} selected` : 'Select all'}
        </button>
      </div>
      
      <div className="space-y-2">
        {questions.map(question => {
          const progress = campaign.questionProgress[question.id];
          const isExpanded = expandedId === question.id;
          const draft = progress?.selectedDraftId ? campaign.drafts[progress.selectedDraftId] : null;
          
          return (
            <div key={question.id} className="border border-border rounded-lg overflow-hidden">
              <div className="flex items-center gap-3 p-3 bg-surface-elevated hover:bg-surface-hover cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : question.id)}>
                <button onClick={(e) => { e.stopPropagation(); handleToggleSelect(question.id); }} className="shrink-0">
                  {selectedIds.has(question.id) ? <CheckSquare className="w-4 h-4 text-accent-blue" /> : <Square className="w-4 h-4 text-text-secondary" />}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{question.questionNumber}</span>
                    <span className="text-xs text-text-secondary px-1.5 py-0.5 bg-surface-base rounded">{question.discipline}</span>
                    <StatusBadge status={progress?.status || 'pending'} />
                  </div>
                  <div className="text-xs text-text-secondary mt-0.5 truncate">{question.questionText}</div>
                </div>
                {progress?.qualityScore !== undefined && <ScoreBadge score={progress.qualityScore} />}
                {progress?.consistencyIssues?.filter(i => !i.resolved).length > 0 && (
                  <span className="flex items-center gap-1 text-xs text-accent-amber"><AlertTriangle className="w-3 h-3" />{progress.consistencyIssues.filter(i => !i.resolved).length}</span>
                )}
                {isExpanded ? <ChevronDown className="w-4 h-4 text-text-secondary" /> : <ChevronRight className="w-4 h-4 text-text-secondary" />}
              </div>
              
              {isExpanded && (
                <div className="p-4 border-t border-border bg-surface-base space-y-4">
                  <div><div className="text-xs text-text-secondary mb-1">Question</div><div className="text-sm">{question.questionText}</div></div>
                  {draft && (
                    <div>
                      <div className="text-xs text-text-secondary mb-1">Response Draft</div>
                      <div className="text-sm p-3 bg-surface-elevated rounded-lg border border-border max-h-40 overflow-y-auto">{draft.content.substring(0, 500)}{draft.content.length > 500 && '...'}</div>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button onClick={() => onSelectQuestion?.(question.id)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-surface-elevated border border-border rounded-lg hover:bg-surface-hover"><Eye className="w-3 h-3" /> View</button>
                    <button onClick={() => regenerateDraft(campaign.id, question.id)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-surface-elevated border border-border rounded-lg hover:bg-surface-hover"><RefreshCw className="w-3 h-3" /> Regenerate</button>
                    {(progress?.status === 'generated' || progress?.status === 'reviewing') && (
                      <button onClick={() => approveQuestion(campaign.id, question.id)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-accent-green/20 text-accent-green rounded-lg hover:bg-accent-green/30"><CheckCircle className="w-3 h-3" /> Approve</button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// TAB: QUALITY
// ============================================================================

function QualityTab({ campaign }: { campaign: ResponseCampaign }) {
  const metrics = campaign.qualityMetrics;
  
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold mb-3">Score Distribution</h3>
        <div className="grid grid-cols-5 gap-2">
          {[
            { label: 'Excellent (90+)', count: metrics.scoreDistribution.excellent, color: 'bg-accent-green' },
            { label: 'Good (80-89)', count: metrics.scoreDistribution.good, color: 'bg-accent-green/70' },
            { label: 'Acceptable (70-79)', count: metrics.scoreDistribution.acceptable, color: 'bg-accent-amber' },
            { label: 'Needs Work (60-69)', count: metrics.scoreDistribution.needsWork, color: 'bg-accent-amber/70' },
            { label: 'Poor (<60)', count: metrics.scoreDistribution.poor, color: 'bg-accent-red' }
          ].map(({ label, count, color }) => (
            <div key={label} className="text-center p-3 bg-surface-elevated rounded-lg border border-border">
              <div className={`w-8 h-8 mx-auto rounded-full ${color} flex items-center justify-center text-white font-bold text-sm mb-2`}>{count}</div>
              <div className="text-[10px] text-text-secondary">{label}</div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-surface-elevated rounded-lg border border-border"><div className="text-xs text-text-secondary">Average</div><div className="text-2xl font-bold mt-1">{metrics.averageScore}</div></div>
        <div className="p-4 bg-surface-elevated rounded-lg border border-border"><div className="text-xs text-text-secondary">Min</div><div className="text-2xl font-bold mt-1">{metrics.minScore}</div></div>
        <div className="p-4 bg-surface-elevated rounded-lg border border-border"><div className="text-xs text-text-secondary">Max</div><div className="text-2xl font-bold mt-1">{metrics.maxScore}</div></div>
        <div className="p-4 bg-surface-elevated rounded-lg border border-border"><div className="text-xs text-text-secondary">Variance</div><div className="text-2xl font-bold mt-1">{metrics.scoreVariance}</div></div>
      </div>
      
      <div>
        <h3 className="text-sm font-semibold mb-3">By Discipline</h3>
        <div className="space-y-2">
          {Object.entries(metrics.byDiscipline).map(([discipline, data]) => (
            <div key={discipline} className="flex items-center justify-between p-3 bg-surface-elevated rounded-lg border border-border">
              <div className="flex items-center gap-3"><span className="font-medium text-sm">{discipline}</span><span className="text-xs text-text-secondary">{data.questionCount} questions</span></div>
              <div className="flex items-center gap-4">
                <div className="text-xs text-text-secondary">{data.completedCount}/{data.questionCount} complete</div>
                <ScoreBadge score={Math.round(data.averageScore)} showLabel />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// TAB: CONSISTENCY
// ============================================================================

function ConsistencyTab({ campaign }: { campaign: ResponseCampaign }) {
  const { resolveConsistencyIssue, applyAutoFixes } = useResponseCampaign();
  const results = campaign.consistencyResults;
  const unresolvedCount = results.reduce((sum, r) => sum + r.issues.filter(i => !i.resolved).length, 0);
  const autoFixableCount = results.reduce((sum, r) => sum + r.issues.filter(i => i.canAutoFix && !i.resolved).length, 0);
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-accent-green" /><span className="text-sm">{results.filter(r => r.passed).length} passed</span></div>
          <div className="flex items-center gap-2"><XCircle className="w-4 h-4 text-accent-red" /><span className="text-sm">{results.filter(r => !r.passed).length} failed</span></div>
          <div className="flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-accent-amber" /><span className="text-sm">{unresolvedCount} issues</span></div>
        </div>
        {autoFixableCount > 0 && (
          <button onClick={() => applyAutoFixes(campaign.id)} className="flex items-center gap-2 px-3 py-1.5 text-sm bg-accent-blue text-white rounded-lg hover:bg-accent-blue/90">
            <Zap className="w-4 h-4" /> Auto-Fix {autoFixableCount}
          </button>
        )}
      </div>
      
      <div className="space-y-3">
        {results.map(result => (
          <div key={result.id} className="border border-border rounded-lg overflow-hidden">
            <div className={`flex items-center justify-between p-3 ${result.passed ? 'bg-accent-green/10' : 'bg-accent-red/10'}`}>
              <div className="flex items-center gap-2">
                {result.passed ? <CheckCircle className="w-4 h-4 text-accent-green" /> : <XCircle className="w-4 h-4 text-accent-red" />}
                <span className="font-medium text-sm">{result.ruleName}</span>
              </div>
              <span className="text-xs text-text-secondary">{result.issues.length === 0 ? 'No issues' : `${result.issues.length} issue(s)`}</span>
            </div>
            {result.issues.length > 0 && (
              <div className="p-3 space-y-2">
                {result.issues.map(issue => (
                  <div key={issue.id} className={`flex items-start gap-2 p-2 rounded-lg ${issue.resolved ? 'bg-surface-elevated opacity-60' : 'bg-surface-base'}`}>
                    <AlertTriangle className={`w-4 h-4 mt-0.5 shrink-0 ${issue.severity === 'error' ? 'text-accent-red' : 'text-accent-amber'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm">{issue.description}</div>
                      {issue.suggestedFix && <div className="text-xs text-text-secondary mt-1">Fix: {issue.suggestedFix}</div>}
                    </div>
                    {!issue.resolved && (
                      <button onClick={() => resolveConsistencyIssue(campaign.id, issue.id)} className="text-xs text-accent-blue hover:underline">Resolve</button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// TAB: PACKAGE
// ============================================================================

function PackageTab({ campaign }: { campaign: ResponseCampaign }) {
  const { generateSubmissionPackage, exportPackage, isProcessing } = useResponseCampaign();
  const pkg = campaign.submissionPackage;
  
  const handleGenerate = useCallback(async () => {
    try { await generateSubmissionPackage(campaign.id); } catch (err) { console.error('Package generation failed:', err); }
  }, [campaign.id, generateSubmissionPackage]);
  
  const handleExport = useCallback(async (format: 'word' | 'pdf' | 'both') => {
    try { await exportPackage(campaign.id, format); } catch (err) { console.error('Export failed:', err); }
  }, [campaign.id, exportPackage]);
  
  if (!pkg) {
    return (
      <div className="text-center py-12">
        <Package className="w-12 h-12 mx-auto text-text-secondary mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Submission Package</h3>
        <p className="text-sm text-text-secondary mb-6">Generate a submission package when all responses are ready</p>
        <button onClick={handleGenerate} disabled={isProcessing} className="inline-flex items-center gap-2 px-4 py-2 bg-accent-blue text-white rounded-lg hover:bg-accent-blue/90 disabled:opacity-50">
          <Package className="w-4 h-4" /> Generate Package
        </button>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Submission Package</h3>
          <p className="text-sm text-text-secondary">Created {new Date(pkg.createdAt).toLocaleString()}</p>
        </div>
        <StatusBadge status={pkg.status} />
      </div>
      
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 bg-surface-elevated rounded-lg border border-border text-center">
          <FileText className="w-8 h-8 mx-auto text-text-secondary mb-2" />
          <div className="text-2xl font-bold">{pkg.responses.length}</div>
          <div className="text-xs text-text-secondary">Responses</div>
        </div>
        <div className="p-4 bg-surface-elevated rounded-lg border border-border text-center">
          <CheckCircle className="w-8 h-8 mx-auto text-accent-green mb-2" />
          <div className="text-2xl font-bold">{pkg.responseMatrix?.filter(r => r.status === 'included').length || 0}</div>
          <div className="text-xs text-text-secondary">Included</div>
        </div>
        <div className="p-4 bg-surface-elevated rounded-lg border border-border text-center">
          <Clock className="w-8 h-8 mx-auto text-accent-amber mb-2" />
          <div className="text-2xl font-bold">{pkg.responseMatrix?.filter(r => r.status === 'pending').length || 0}</div>
          <div className="text-xs text-text-secondary">Pending</div>
        </div>
      </div>
      
      {pkg.coverLetter && (
        <div>
          <h4 className="text-sm font-semibold mb-2">Cover Letter</h4>
          <div className="p-4 bg-surface-elevated rounded-lg border border-border text-sm whitespace-pre-wrap">{pkg.coverLetter.content}</div>
        </div>
      )}
      
      <div className="flex gap-3">
        <button onClick={() => handleExport('word')} className="flex items-center gap-2 px-4 py-2 bg-surface-elevated border border-border rounded-lg hover:bg-surface-hover">
          <Download className="w-4 h-4" /> Export Word
        </button>
        <button onClick={() => handleExport('pdf')} className="flex items-center gap-2 px-4 py-2 bg-surface-elevated border border-border rounded-lg hover:bg-surface-hover">
          <Download className="w-4 h-4" /> Export PDF
        </button>
        <button onClick={() => handleExport('both')} className="flex items-center gap-2 px-4 py-2 bg-accent-blue text-white rounded-lg hover:bg-accent-blue/90">
          <Download className="w-4 h-4" /> Export Both
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function CampaignDashboard({ campaignId, onSelectQuestion }: CampaignDashboardProps) {
  const { getCampaign } = useResponseCampaign();
  const activeCampaign = useResponseCampaign(state => state.activeCampaignId ? state.campaigns[state.activeCampaignId] : null);
  const [activeTab, setActiveTab] = useState<CampaignTab>('overview');
  
  const campaign = campaignId ? getCampaign(campaignId) : activeCampaign;
  
  if (!campaign) {
    return (
      <div className="text-center py-12">
        <Layers className="w-12 h-12 mx-auto text-text-secondary mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Campaign Selected</h3>
        <p className="text-sm text-text-secondary">Create or select a campaign to get started</p>
      </div>
    );
  }
  
  const tabs: { id: CampaignTab; label: string; icon: typeof Layers }[] = [
    { id: 'overview', label: 'Overview', icon: Layers },
    { id: 'questions', label: 'Questions', icon: FileText },
    { id: 'quality', label: 'Quality', icon: Target },
    { id: 'consistency', label: 'Consistency', icon: CheckSquare },
    { id: 'package', label: 'Package', icon: Package }
  ];
  
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div>
          <h2 className="font-semibold">{campaign.config.name}</h2>
          <p className="text-sm text-text-secondary">{campaign.config.questionIds.length} questions • <StatusBadge status={campaign.status} /></p>
        </div>
      </div>
      
      <div className="flex border-b border-border">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${activeTab === tab.id ? 'border-accent-blue text-accent-blue' : 'border-transparent text-text-secondary hover:text-text-primary'}`}>
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>
      
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'overview' && <OverviewTab campaign={campaign} />}
        {activeTab === 'questions' && <QuestionsTab campaign={campaign} onSelectQuestion={onSelectQuestion} />}
        {activeTab === 'quality' && <QualityTab campaign={campaign} />}
        {activeTab === 'consistency' && <ConsistencyTab campaign={campaign} />}
        {activeTab === 'package' && <PackageTab campaign={campaign} />}
      </div>
    </div>
  );
}

export default CampaignDashboard;
