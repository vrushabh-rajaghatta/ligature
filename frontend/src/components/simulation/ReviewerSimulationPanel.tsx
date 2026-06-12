

import { useState, useMemo } from 'react';
import {
  Brain, Target, Shield, TrendingUp, AlertTriangle, CheckCircle, 
  XCircle, ChevronRight, ChevronDown, Settings, RefreshCw,
  BarChart3, PieChart, FileText, Lightbulb, Clock, Users,
  Zap, Eye, Activity, ArrowRight, Info, Star, AlertCircle
} from 'lucide-react';
import {
  useReviewerSimulation,
  useActivePersona,
  useCompletenessScore,
  useGapAnalysis,
  useApplicationRisk,
  useLatestAudit,
  useAnalysisProgress,
  usePersonas,
  type CompletenessScore,
  type GapAnalysis,
  type PreSubmissionAudit,
  type SubmissionRiskProfile,
  type ReviewerPersona,
} from '@/store/useReviewerSimulation';

// ============================================================================
// TYPES
// ============================================================================

type SimulationTab = 'analyzer' | 'audit' | 'risk' | 'personas';

interface ReviewerSimulationPanelProps {
  questionId?: string;
  applicationId?: string;
  responseText?: string;
  onSuggestionApply?: (suggestion: string) => void;
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function ScoreGauge({ score, size = 120, label }: { score: number; size?: number; label?: string }) {
  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  
  const getScoreColor = (s: number) => {
    if (s >= 80) return 'text-accent-green';
    if (s >= 60) return 'text-accent-amber';
    return 'text-accent-red';
  };
  
  const getStrokeColor = (s: number) => {
    if (s >= 80) return '#22c55e';
    if (s >= 60) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <div className="relative flex flex-col items-center">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="currentColor" strokeWidth="8" fill="none" className="text-surface-elevated" />
        <circle cx={size / 2} cy={size / 2} r={radius} stroke={getStrokeColor(score)} strokeWidth="8" fill="none" strokeDasharray={circumference} strokeDashoffset={circumference - progress} strokeLinecap="round" className="transition-all duration-500" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-2xl font-bold ${getScoreColor(score)}`}>{score}</span>
        {label && <span className="text-xs text-text-secondary">{label}</span>}
      </div>
    </div>
  );
}

function DimensionBar({ label, score, weight }: { label: string; score: number; weight: number }) {
  const getBarColor = (s: number) => {
    if (s >= 80) return 'bg-accent-green';
    if (s >= 60) return 'bg-accent-amber';
    return 'bg-accent-red';
  };

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-text-secondary">{label}</span>
        <span className="text-text-primary font-medium">{score}</span>
      </div>
      <div className="h-2 bg-surface-elevated rounded-full overflow-hidden">
        <div className={`h-full ${getBarColor(score)} transition-all duration-300`} style={{ width: `${score}%` }} />
      </div>
      <div className="text-[10px] text-text-muted">Weight: {Math.round(weight * 100)}%</div>
    </div>
  );
}

function ElementStatus({ status }: { status: 'present' | 'partial' | 'missing' }) {
  const config = {
    present: { icon: CheckCircle, color: 'text-accent-green', label: 'Present' },
    partial: { icon: AlertCircle, color: 'text-accent-amber', label: 'Partial' },
    missing: { icon: XCircle, color: 'text-accent-red', label: 'Missing' }
  };
  const { icon: Icon, color, label } = config[status];
  return (
    <div className={`flex items-center gap-1 ${color}`}>
      <Icon className="w-3.5 h-3.5" />
      <span className="text-xs">{label}</span>
    </div>
  );
}

function RiskBadge({ level }: { level: 'low' | 'moderate' | 'elevated' | 'high' }) {
  const config = {
    low: { bg: 'bg-accent-green/20', text: 'text-accent-green', label: 'Low' },
    moderate: { bg: 'bg-accent-blue/20', text: 'text-accent-blue', label: 'Moderate' },
    elevated: { bg: 'bg-accent-amber/20', text: 'text-accent-amber', label: 'Elevated' },
    high: { bg: 'bg-accent-red/20', text: 'text-accent-red', label: 'High' }
  };
  const { bg, text, label } = config[level];
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${bg} ${text}`}>{label}</span>;
}

function ReadinessBadge({ status }: { status: 'not-ready' | 'needs-work' | 'nearly-ready' | 'ready' }) {
  const config = {
    'not-ready': { bg: 'bg-accent-red/20', text: 'text-accent-red', label: 'Not Ready' },
    'needs-work': { bg: 'bg-accent-amber/20', text: 'text-accent-amber', label: 'Needs Work' },
    'nearly-ready': { bg: 'bg-accent-blue/20', text: 'text-accent-blue', label: 'Nearly Ready' },
    'ready': { bg: 'bg-accent-green/20', text: 'text-accent-green', label: 'Ready' }
  };
  const { bg, text, label } = config[status];
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${bg} ${text}`}>{label}</span>;
}

// ============================================================================
// TAB: RESPONSE ANALYZER
// ============================================================================

function ResponseAnalyzerTab({ questionId, responseText, onSuggestionApply }: { questionId?: string; responseText?: string; onSuggestionApply?: (s: string) => void }) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { analyzeResponseCompleteness, simulateReviewerResponse } = useReviewerSimulation();
  const cachedScore = useCompletenessScore(questionId || '');
  const cachedGaps = useGapAnalysis(questionId || '');
  const activePersona = useActivePersona();
  
  const [score, setScore] = useState<CompletenessScore | null>(cachedScore || null);
  const [simulation, setSimulation] = useState<ReturnType<typeof simulateReviewerResponse> | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['dimensions', 'gaps']));
  
  const handleAnalyze = async () => {
    if (!questionId || !responseText) return;
    setIsAnalyzing(true);
    try {
      const result = analyzeResponseCompleteness(questionId, responseText);
      setScore(result);
      const sim = simulateReviewerResponse(questionId, responseText);
      setSimulation(sim);
    } catch (error) {
      console.error('Analysis failed:', error);
    }
    setIsAnalyzing(false);
  };
  
  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  };
  
  if (!questionId) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-text-secondary">
        <Brain className="w-12 h-12 mb-3 opacity-50" />
        <p className="text-sm">Select a question to analyze</p>
      </div>
    );
  }
  
  if (!responseText || responseText.trim().length < 50) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-text-secondary">
        <FileText className="w-12 h-12 mb-3 opacity-50" />
        <p className="text-sm">Add response text to analyze</p>
        <p className="text-xs mt-1">Minimum 50 characters required</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-text-secondary">
          {activePersona ? <span>Analyzing as: <span className="text-text-primary font-medium">{activePersona.name}</span></span> : <span>Using auto-selected reviewer persona</span>}
        </div>
        <button onClick={handleAnalyze} disabled={isAnalyzing} className="flex items-center gap-2 px-4 py-2 bg-accent-blue text-white rounded-lg hover:bg-accent-blue/90 disabled:opacity-50 transition-colors">
          {isAnalyzing ? <><RefreshCw className="w-4 h-4 animate-spin" />Analyzing...</> : <><Brain className="w-4 h-4" />Analyze Response</>}
        </button>
      </div>
      
      {score && (
        <>
          <div className="bg-surface-elevated rounded-xl p-4">
            <div className="flex items-start gap-6">
              <ScoreGauge score={score.overall} label="Overall" />
              <div className="flex-1 space-y-3">
                <div>
                  <div className="text-sm font-medium text-text-primary">Predicted Outcome</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-lg font-bold capitalize ${score.predictedOutcome.mostLikely === 'accepted' ? 'text-accent-green' : score.predictedOutcome.mostLikely === 'follow-up' ? 'text-accent-amber' : 'text-accent-red'}`}>{score.predictedOutcome.mostLikely}</span>
                    <span className="text-sm text-text-secondary">({score.predictedOutcome.probability}% confidence)</span>
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-text-primary">Benchmark</div>
                  <div className="text-sm text-text-secondary mt-1">
                    {score.benchmarkComparison.percentile}th percentile • 
                    {score.benchmarkComparison.gap > 0 ? <span className="text-accent-amber"> {score.benchmarkComparison.gap} points below average</span> : <span className="text-accent-green"> {Math.abs(score.benchmarkComparison.gap)} points above average</span>}
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-surface-elevated rounded-xl overflow-hidden">
            <button onClick={() => toggleSection('dimensions')} className="w-full flex items-center justify-between p-4 hover:bg-surface-hover transition-colors">
              <div className="flex items-center gap-2"><BarChart3 className="w-4 h-4 text-accent-blue" /><span className="font-medium">Dimension Scores</span></div>
              {expandedSections.has('dimensions') ? <ChevronDown className="w-4 h-4 text-text-secondary" /> : <ChevronRight className="w-4 h-4 text-text-secondary" />}
            </button>
            {expandedSections.has('dimensions') && (
              <div className="px-4 pb-4 space-y-3">
                <DimensionBar label="Content Coverage" score={score.dimensions.contentCoverage.score} weight={score.dimensions.contentCoverage.weight} />
                <DimensionBar label="Evidence Quality" score={score.dimensions.evidenceQuality.score} weight={score.dimensions.evidenceQuality.weight} />
                <DimensionBar label="Regulatory Alignment" score={score.dimensions.regulatoryAlignment.score} weight={score.dimensions.regulatoryAlignment.weight} />
                <DimensionBar label="Clarity" score={score.dimensions.clarity.score} weight={score.dimensions.clarity.weight} />
                <DimensionBar label="Completeness" score={score.dimensions.completeness.score} weight={score.dimensions.completeness.weight} />
              </div>
            )}
          </div>
          
          {cachedGaps && (
            <div className="bg-surface-elevated rounded-xl overflow-hidden">
              <button onClick={() => toggleSection('gaps')} className="w-full flex items-center justify-between p-4 hover:bg-surface-hover transition-colors">
                <div className="flex items-center gap-2"><Target className="w-4 h-4 text-accent-purple" /><span className="font-medium">Response Elements</span><ReadinessBadge status={cachedGaps.summary.overallReadiness} /></div>
                {expandedSections.has('gaps') ? <ChevronDown className="w-4 h-4 text-text-secondary" /> : <ChevronRight className="w-4 h-4 text-text-secondary" />}
              </button>
              {expandedSections.has('gaps') && (
                <div className="px-4 pb-4 space-y-4">
                  <div>
                    <div className="text-xs font-medium text-text-secondary mb-2">Required ({cachedGaps.summary.requiredMet}/{cachedGaps.summary.requiredTotal})</div>
                    <div className="space-y-2">
                      {cachedGaps.requiredElements.map((elem, idx) => (
                        <div key={idx} className="flex items-center justify-between py-1 px-2 rounded bg-surface hover:bg-surface-hover">
                          <span className="text-sm capitalize">{elem.element.replace(/-/g, ' ')}</span>
                          <ElementStatus status={elem.status} />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-medium text-text-secondary mb-2">Expected ({cachedGaps.summary.expectedMet}/{cachedGaps.summary.expectedTotal})</div>
                    <div className="space-y-2">
                      {cachedGaps.expectedElements.map((elem, idx) => (
                        <div key={idx} className="flex items-center justify-between py-1 px-2 rounded bg-surface hover:bg-surface-hover">
                          <span className="text-sm capitalize">{elem.element.replace(/-/g, ' ')}</span>
                          <ElementStatus status={elem.status} />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {simulation && simulation.suggestedImprovements.length > 0 && (
            <div className="bg-surface-elevated rounded-xl overflow-hidden">
              <button onClick={() => toggleSection('suggestions')} className="w-full flex items-center justify-between p-4 hover:bg-surface-hover transition-colors">
                <div className="flex items-center gap-2"><Lightbulb className="w-4 h-4 text-accent-amber" /><span className="font-medium">Suggested Improvements</span><span className="text-xs text-text-muted">({simulation.suggestedImprovements.length})</span></div>
                {expandedSections.has('suggestions') ? <ChevronDown className="w-4 h-4 text-text-secondary" /> : <ChevronRight className="w-4 h-4 text-text-secondary" />}
              </button>
              {expandedSections.has('suggestions') && (
                <div className="px-4 pb-4 space-y-2">
                  {simulation.suggestedImprovements.map((suggestion, idx) => (
                    <div key={idx} className="flex items-start gap-2 p-2 rounded bg-surface hover:bg-surface-hover group">
                      <ArrowRight className="w-4 h-4 text-accent-blue shrink-0 mt-0.5" />
                      <span className="text-sm flex-1">{suggestion}</span>
                      {onSuggestionApply && <button onClick={() => onSuggestionApply(suggestion)} className="text-xs text-accent-blue opacity-0 group-hover:opacity-100 transition-opacity">Apply</button>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {simulation && (
            <div className="bg-surface-elevated rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3"><Eye className="w-4 h-4 text-accent-teal" /><span className="font-medium">Simulated Reviewer Feedback</span></div>
              <div className="text-sm text-text-secondary mb-2">Based on: <span className="text-text-primary">{simulation.persona}</span></div>
              {simulation.strengthsNoted.length > 0 && (
                <div className="mb-3">
                  <div className="text-xs font-medium text-accent-green mb-1">Strengths</div>
                  {simulation.strengthsNoted.map((s, idx) => <div key={idx} className="text-sm text-text-secondary flex items-start gap-2"><CheckCircle className="w-3 h-3 text-accent-green shrink-0 mt-1" />{s}</div>)}
                </div>
              )}
              {simulation.likelyFollowUps.length > 0 && (
                <div>
                  <div className="text-xs font-medium text-accent-amber mb-1">Likely Follow-up Questions</div>
                  {simulation.likelyFollowUps.map((f, idx) => <div key={idx} className="text-sm text-text-secondary flex items-start gap-2"><AlertTriangle className="w-3 h-3 text-accent-amber shrink-0 mt-1" />{f}</div>)}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ============================================================================
// TAB: PRE-SUBMISSION AUDIT
// ============================================================================

function PreSubmissionAuditTab({ applicationId }: { applicationId?: string }) {
  const { runPreSubmissionAudit } = useReviewerSimulation();
  const { isAnalyzing, progress } = useAnalysisProgress();
  const latestAudit = useLatestAudit(applicationId || '');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['overview']));
  
  const handleRunAudit = async () => { if (applicationId) await runPreSubmissionAudit(applicationId); };
  const toggleSection = (s: string) => { setExpandedSections(prev => { const next = new Set(prev); if (next.has(s)) next.delete(s); else next.add(s); return next; }); };
  
  if (!applicationId) {
    return <div className="flex flex-col items-center justify-center py-12 text-text-secondary"><Shield className="w-12 h-12 mb-3 opacity-50" /><p className="text-sm">Select an application to audit</p></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-text-secondary">{latestAudit ? <span>Last audit: {new Date(latestAudit.auditDate).toLocaleDateString()}</span> : <span>No previous audits</span>}</div>
        <button onClick={handleRunAudit} disabled={isAnalyzing} className="flex items-center gap-2 px-4 py-2 bg-accent-purple text-white rounded-lg hover:bg-accent-purple/90 disabled:opacity-50 transition-colors">
          {isAnalyzing ? <><RefreshCw className="w-4 h-4 animate-spin" />Auditing... {progress}%</> : <><Shield className="w-4 h-4" />Run Audit</>}
        </button>
      </div>
      
      {latestAudit && (
        <>
          <div className="bg-surface-elevated rounded-xl p-4">
            <div className="flex items-start gap-6">
              <ScoreGauge score={latestAudit.overallReadiness.score} label="Readiness" />
              <div className="flex-1 space-y-3">
                <div><div className="text-sm font-medium text-text-primary">Submission Readiness</div><ReadinessBadge status={latestAudit.overallReadiness.status} /></div>
                <div><div className="text-sm font-medium text-text-primary">Expected Questions</div><div className="text-sm text-text-secondary mt-1">{latestAudit.overallReadiness.estimatedQuestionCount.min}–{latestAudit.overallReadiness.estimatedQuestionCount.max} questions<span className="text-text-muted"> (likely: {latestAudit.overallReadiness.estimatedQuestionCount.expected})</span></div></div>
              </div>
            </div>
          </div>
          
          <div className="bg-surface-elevated rounded-xl overflow-hidden">
            <button onClick={() => toggleSection('sections')} className="w-full flex items-center justify-between p-4 hover:bg-surface-hover transition-colors">
              <div className="flex items-center gap-2"><FileText className="w-4 h-4 text-accent-blue" /><span className="font-medium">CTD Section Analysis</span><span className="text-xs text-text-muted">({latestAudit.sectionAudits.length} sections)</span></div>
              {expandedSections.has('sections') ? <ChevronDown className="w-4 h-4 text-text-secondary" /> : <ChevronRight className="w-4 h-4 text-text-secondary" />}
            </button>
            {expandedSections.has('sections') && (
              <div className="px-4 pb-4 space-y-2">
                {latestAudit.sectionAudits.map((section, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-surface hover:bg-surface-hover">
                    <div className="flex-1"><div className="text-sm font-medium">{section.ctdSection}</div><div className="text-xs text-text-secondary">{section.sectionName}</div></div>
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${section.readiness.status === 'green' ? 'bg-accent-green' : section.readiness.status === 'yellow' ? 'bg-accent-amber' : 'bg-accent-red'}`} />
                      <span className="text-sm font-medium w-8 text-right">{section.readiness.score}</span>
                      <span className="text-xs text-text-muted w-16 text-right">{section.anticipatedQuestions.length} Q's</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {latestAudit.priorityActions.length > 0 && (
            <div className="bg-surface-elevated rounded-xl overflow-hidden">
              <button onClick={() => toggleSection('actions')} className="w-full flex items-center justify-between p-4 hover:bg-surface-hover transition-colors">
                <div className="flex items-center gap-2"><Zap className="w-4 h-4 text-accent-amber" /><span className="font-medium">Priority Actions</span><span className="text-xs text-text-muted">({latestAudit.priorityActions.length})</span></div>
                {expandedSections.has('actions') ? <ChevronDown className="w-4 h-4 text-text-secondary" /> : <ChevronRight className="w-4 h-4 text-text-secondary" />}
              </button>
              {expandedSections.has('actions') && (
                <div className="px-4 pb-4 space-y-2">
                  {latestAudit.priorityActions.map((action, idx) => (
                    <div key={idx} className="p-3 rounded-lg bg-surface">
                      <div className="flex items-start gap-2">
                        <span className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${action.priority === 1 ? 'bg-accent-red/20 text-accent-red' : action.priority === 2 ? 'bg-accent-amber/20 text-accent-amber' : 'bg-accent-blue/20 text-accent-blue'}`}>{action.priority}</span>
                        <div className="flex-1"><div className="text-sm">{action.action}</div><div className="flex items-center gap-3 mt-1 text-xs text-text-muted"><span>{action.owner}</span><span>•</span><span>{action.effort}</span></div></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ============================================================================
// TAB: RISK DASHBOARD
// ============================================================================

function RiskDashboardTab({ applicationId }: { applicationId?: string }) {
  const { calculateRiskProfile } = useReviewerSimulation();
  const riskProfile = useApplicationRisk(applicationId || '');
  const [isCalculating, setIsCalculating] = useState(false);
  
  const handleCalculateRisk = () => { if (!applicationId) return; setIsCalculating(true); calculateRiskProfile(applicationId); setIsCalculating(false); };
  
  if (!applicationId) {
    return <div className="flex flex-col items-center justify-center py-12 text-text-secondary"><Activity className="w-12 h-12 mb-3 opacity-50" /><p className="text-sm">Select an application for risk analysis</p></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-text-secondary">{riskProfile ? <span>Last calculated: {new Date(riskProfile.calculatedAt).toLocaleDateString()}</span> : <span>No risk profile calculated</span>}</div>
        <button onClick={handleCalculateRisk} disabled={isCalculating} className="flex items-center gap-2 px-4 py-2 bg-accent-teal text-white rounded-lg hover:bg-accent-teal/90 disabled:opacity-50 transition-colors">
          {isCalculating ? <><RefreshCw className="w-4 h-4 animate-spin" />Calculating...</> : <><Activity className="w-4 h-4" />Calculate Risk</>}
        </button>
      </div>
      
      {riskProfile && (
        <>
          <div className="bg-surface-elevated rounded-xl p-4">
            <div className="flex items-start gap-6">
              <div className="relative"><ScoreGauge score={riskProfile.overallRisk.score} label="Risk" /><div className="absolute -bottom-1 left-1/2 -translate-x-1/2"><RiskBadge level={riskProfile.overallRisk.level} /></div></div>
              <div className="flex-1 space-y-3">
                <div className="text-sm font-medium text-text-primary">Overall Submission Risk</div>
                <div className="text-sm text-text-secondary">Trend: <span className={riskProfile.overallRisk.trend === 'improving' ? 'text-accent-green' : riskProfile.overallRisk.trend === 'worsening' ? 'text-accent-red' : 'text-text-primary'}>{riskProfile.overallRisk.trend}</span></div>
              </div>
            </div>
          </div>
          
          <div className="bg-surface-elevated rounded-xl p-4">
            <div className="text-sm font-medium mb-3">Risk Dimensions</div>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(riskProfile.riskDimensions).map(([key, dim]) => (
                <div key={key} className="p-3 rounded-lg bg-surface">
                  <div className="flex items-center justify-between mb-1"><span className="text-xs text-text-secondary capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span><RiskBadge level={dim.level} /></div>
                  <div className="text-lg font-bold">{dim.score}</div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="bg-surface-elevated rounded-xl p-4">
            <div className="text-sm font-medium mb-3">Risk by Discipline</div>
            <div className="space-y-2">
              {riskProfile.disciplineRisks.map((risk, idx) => (
                <div key={idx} className="flex items-center gap-3 p-2 rounded bg-surface">
                  <span className="text-sm w-24">{risk.discipline}</span>
                  <div className="flex-1 h-2 bg-surface-elevated rounded-full overflow-hidden">
                    <div className={`h-full ${risk.riskLevel === 'high' ? 'bg-accent-red' : risk.riskLevel === 'elevated' ? 'bg-accent-amber' : risk.riskLevel === 'moderate' ? 'bg-accent-blue' : 'bg-accent-green'}`} style={{ width: `${risk.riskScore}%` }} />
                  </div>
                  <span className="text-sm w-8 text-right">{risk.riskScore}</span>
                </div>
              ))}
            </div>
          </div>
          
          {riskProfile.mitigationPlan.length > 0 && (
            <div className="bg-surface-elevated rounded-xl p-4">
              <div className="text-sm font-medium mb-3">Mitigation Recommendations</div>
              <div className="space-y-2">
                {riskProfile.mitigationPlan.map((rec, idx) => (
                  <div key={idx} className="p-3 rounded-lg bg-surface">
                    <div className="flex items-start gap-2">
                      <span className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${rec.priority === 1 ? 'bg-accent-red/20 text-accent-red' : rec.priority === 2 ? 'bg-accent-amber/20 text-accent-amber' : 'bg-accent-blue/20 text-accent-blue'}`}>{rec.priority}</span>
                      <div className="flex-1"><div className="text-sm">{rec.action}</div><div className="text-xs text-text-muted mt-1">{rec.expectedImpact} • {rec.effort}</div></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ============================================================================
// TAB: PERSONA SETTINGS
// ============================================================================

function PersonaSettingsTab() {
  const personas = usePersonas();
  const activePersona = useActivePersona();
  const { setActivePersona } = useReviewerSimulation();
  const [selectedPersonaId, setSelectedPersonaId] = useState<string | null>(activePersona?.id || null);
  const selectedPersona = useMemo(() => personas.find(p => p.id === selectedPersonaId), [personas, selectedPersonaId]);

  return (
    <div className="space-y-4">
      <div className="bg-surface-elevated rounded-xl p-4">
        <div className="text-sm font-medium mb-3">Select Reviewer Persona</div>
        <div className="space-y-2">
          <button onClick={() => { setSelectedPersonaId(null); setActivePersona(null); }} className={`w-full p-3 rounded-lg text-left transition-colors ${!selectedPersonaId ? 'bg-accent-blue/20 border border-accent-blue' : 'bg-surface hover:bg-surface-hover'}`}>
            <div className="flex items-center gap-2"><Brain className="w-4 h-4 text-accent-blue" /><span className="font-medium">Auto-select</span></div>
            <div className="text-xs text-text-secondary mt-1">Automatically match persona to question agency</div>
          </button>
          {personas.map(persona => (
            <button key={persona.id} onClick={() => { setSelectedPersonaId(persona.id); setActivePersona(persona.id); }} className={`w-full p-3 rounded-lg text-left transition-colors ${selectedPersonaId === persona.id ? 'bg-accent-blue/20 border border-accent-blue' : 'bg-surface hover:bg-surface-hover'}`}>
              <div className="flex items-center gap-2"><Users className="w-4 h-4 text-text-secondary" /><span className="font-medium">{persona.name}</span></div>
              <div className="text-xs text-text-secondary mt-1">{persona.agency} • {persona.division || 'General'} • Based on {persona.basedOnQuestionCount.toLocaleString()} questions</div>
            </button>
          ))}
        </div>
      </div>
      
      {selectedPersona && (
        <div className="bg-surface-elevated rounded-xl p-4">
          <div className="text-sm font-medium mb-3">Persona Details: {selectedPersona.name}</div>
          <div className="mb-4">
            <div className="text-xs text-text-secondary mb-2">Focus Areas</div>
            <div className="flex flex-wrap gap-1">{selectedPersona.questionPatterns.focusAreas.map((area, idx) => <span key={idx} className="px-2 py-0.5 text-xs bg-surface rounded">{area}</span>)}</div>
          </div>
          <div className="mb-4">
            <div className="text-xs text-text-secondary mb-2">Valued Elements</div>
            <div className="flex flex-wrap gap-1">{selectedPersona.responseExpectations.valueElements.map((elem, idx) => <span key={idx} className="px-2 py-0.5 text-xs bg-accent-green/20 text-accent-green rounded capitalize">{elem.replace(/-/g, ' ')}</span>)}</div>
          </div>
          <div className="mb-4">
            <div className="text-xs text-text-secondary mb-2">Common Issues (Pet Peeves)</div>
            <div className="space-y-1">{selectedPersona.responseExpectations.petPeeves.map((peeve, idx) => <div key={idx} className="flex items-start gap-2 text-xs text-text-secondary"><AlertTriangle className="w-3 h-3 text-accent-amber shrink-0 mt-0.5" />{peeve}</div>)}</div>
          </div>
          <div>
            <div className="text-xs text-text-secondary mb-2">Scoring Weights</div>
            <div className="space-y-1">
              {Object.entries(selectedPersona.scoringWeights).map(([key, weight]) => (
                <div key={key} className="flex items-center gap-2">
                  <span className="text-xs text-text-secondary w-32 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                  <div className="flex-1 h-2 bg-surface rounded-full overflow-hidden"><div className="h-full bg-accent-blue" style={{ width: `${weight * 100}%` }} /></div>
                  <span className="text-xs w-10 text-right">{Math.round(weight * 100)}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ReviewerSimulationPanel({ questionId, applicationId, responseText, onSuggestionApply }: ReviewerSimulationPanelProps) {
  const [activeTab, setActiveTab] = useState<SimulationTab>('analyzer');
  
  const tabs: { id: SimulationTab; label: string; icon: React.ReactNode }[] = [
    { id: 'analyzer', label: 'Response Analyzer', icon: <Brain className="w-4 h-4" /> },
    { id: 'audit', label: 'Pre-submission Audit', icon: <Shield className="w-4 h-4" /> },
    { id: 'risk', label: 'Risk Dashboard', icon: <Activity className="w-4 h-4" /> },
    { id: 'personas', label: 'Personas', icon: <Users className="w-4 h-4" /> },
  ];

  return (
    <div className="flex flex-col h-full bg-surface rounded-xl border border-border overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-surface-elevated">
        <Brain className="w-5 h-5 text-accent-blue" />
        <span className="font-semibold">Reviewer Simulation Engine</span>
      </div>
      
      <div className="flex border-b border-border bg-surface-elevated">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-1.5 px-3 py-2 text-sm transition-colors ${activeTab === tab.id ? 'text-accent-blue border-b-2 border-accent-blue -mb-px' : 'text-text-secondary hover:text-text-primary'}`}>
            {tab.icon}<span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>
      
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'analyzer' && <ResponseAnalyzerTab questionId={questionId} responseText={responseText} onSuggestionApply={onSuggestionApply} />}
        {activeTab === 'audit' && <PreSubmissionAuditTab applicationId={applicationId} />}
        {activeTab === 'risk' && <RiskDashboardTab applicationId={applicationId} />}
        {activeTab === 'personas' && <PersonaSettingsTab />}
      </div>
    </div>
  );
}

export default ReviewerSimulationPanel;
