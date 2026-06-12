// =============================================================================
// AI ASSEMBLY ASSISTANT PANEL - Mockup v1.0
// =============================================================================
// AI-powered submission assembly that analyzes HAQs/IRs and recommends
// documents, identifies reusable content, and flags gaps.
// Target: Match RIMSmart's "1/10th the time" claim
// =============================================================================


import React, { useState, useEffect, useCallback } from 'react';
import {
  Sparkles,
  FileText,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Clock,
  ChevronRight,
  ChevronDown,
  Folder,
  Link2,
  User,
  Calendar,
  Zap,
  Target,
  Eye,
  Edit3,
  Plus,
  ArrowRight,
  Loader2,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  Lightbulb,
} from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

type RecommendationAction = 'reuse' | 'update' | 'new' | 'exclude';
type ConfidenceLevel = 'high' | 'medium' | 'low';
type AnalysisSource = 'haq' | 'content-plan' | 'manual' | 'template';

interface DocumentRecommendation {
  id: string;
  sectionId: string;
  sectionName: string;
  action: RecommendationAction;
  confidence: ConfidenceLevel;
  confidenceScore: number;
  reason: string;
  
  // Source document (for reuse/update)
  sourceDocumentId?: string;
  sourceDocumentName?: string;
  sourceDocumentVersion?: string;
  sourceSequence?: string;
  
  // For new documents
  suggestedAuthor?: string;
  estimatedHours?: number;
  
  // User override
  userAction?: RecommendationAction;
  userNote?: string;
}

interface ContentGap {
  id: string;
  sectionId: string;
  sectionName: string;
  requirement: string;
  severity: 'critical' | 'recommended' | 'optional';
  suggestedAction: string;
  aiSuggestion?: string;
}

interface AIAnalysisResult {
  id: string;
  submissionId: string;
  analysisSource: AnalysisSource;
  sourceDocumentId?: string;
  sourceDocumentTitle?: string;
  analyzedAt: string;
  
  recommendations: DocumentRecommendation[];
  gaps: ContentGap[];
  
  summary: {
    totalDocuments: number;
    reuseCount: number;
    updateCount: number;
    newCount: number;
    excludeCount: number;
    estimatedTimeSavedHours: number;
    gapCount: number;
  };
}

// =============================================================================
// MOCK DATA
// =============================================================================

const MOCK_ANALYSIS: AIAnalysisResult = {
  id: 'analysis-001',
  submissionId: 'NDA-123456-0003',
  analysisSource: 'haq',
  sourceDocumentId: 'haq-2025-001',
  sourceDocumentTitle: 'FDA Information Request - CMC Questions (Jan 2025)',
  analyzedAt: new Date().toISOString(),
  recommendations: [
    {
      id: 'rec-1',
      sectionId: '2.3',
      sectionName: 'Quality Overall Summary',
      action: 'reuse',
      confidence: 'high',
      confidenceScore: 95,
      reason: 'No CMC changes since Seq 0002. Document remains current.',
      sourceDocumentId: 'doc-qos-v21',
      sourceDocumentName: 'Quality Overall Summary',
      sourceDocumentVersion: 'v2.1',
      sourceSequence: 'Seq 0002',
    },
    {
      id: 'rec-2',
      sectionId: '3.2.P.2',
      sectionName: 'Pharmaceutical Development',
      action: 'update',
      confidence: 'high',
      confidenceScore: 92,
      reason: 'HAQ Q3 requests additional dissolution data. Section needs update.',
      sourceDocumentId: 'doc-pd-v18',
      sourceDocumentName: 'Pharmaceutical Development',
      sourceDocumentVersion: 'v1.8',
      sourceSequence: 'Seq 0001',
      suggestedAuthor: 'Michael Roberts',
      estimatedHours: 8,
    },
    {
      id: 'rec-3',
      sectionId: '3.2.P.5.1',
      sectionName: 'Drug Product Specification',
      action: 'update',
      confidence: 'medium',
      confidenceScore: 78,
      reason: 'HAQ Q4 may require specification update based on dissolution method change.',
      sourceDocumentId: 'doc-spec-v30',
      sourceDocumentName: 'Drug Product Specification',
      sourceDocumentVersion: 'v3.0',
      sourceSequence: 'Seq 0002',
      suggestedAuthor: 'Michael Roberts',
      estimatedHours: 4,
    },
    {
      id: 'rec-4',
      sectionId: '2.7',
      sectionName: 'Clinical Summary',
      action: 'reuse',
      confidence: 'high',
      confidenceScore: 98,
      reason: 'No clinical questions in this IR. Clinical Summary unchanged.',
      sourceDocumentId: 'doc-cs-v18',
      sourceDocumentName: 'Clinical Summary',
      sourceDocumentVersion: 'v1.8',
      sourceSequence: 'Seq 0000',
    },
    {
      id: 'rec-5',
      sectionId: '1.2',
      sectionName: 'Cover Letter',
      action: 'new',
      confidence: 'high',
      confidenceScore: 100,
      reason: 'New cover letter required for IR response.',
      suggestedAuthor: 'Sarah Chen',
      estimatedHours: 2,
    },
    {
      id: 'rec-6',
      sectionId: '5.3.5.1',
      sectionName: 'Clinical Study Report',
      action: 'reuse',
      confidence: 'high',
      confidenceScore: 96,
      reason: 'CSR LIG-301 locked and approved. No changes requested.',
      sourceDocumentId: 'doc-csr-v10',
      sourceDocumentName: 'CSR LIG-301',
      sourceDocumentVersion: 'v1.0',
      sourceSequence: 'Seq 0000',
    },
  ],
  gaps: [
    {
      id: 'gap-1',
      sectionId: '3.2.P.8.3',
      sectionName: 'Validation of Analytical Procedures',
      requirement: 'HAQ Q5 requests validation data for updated dissolution method',
      severity: 'critical',
      suggestedAction: 'Create new validation report section',
      aiSuggestion: 'Based on similar HAQ responses, recommend including method transfer protocol and ICH Q2 validation parameters.',
    },
  ],
  summary: {
    totalDocuments: 6,
    reuseCount: 3,
    updateCount: 2,
    newCount: 1,
    excludeCount: 0,
    estimatedTimeSavedHours: 32,
    gapCount: 1,
  },
};

// =============================================================================
// COMPONENTS
// =============================================================================

const ACTION_CONFIG: Record<RecommendationAction, { label: string; icon: React.ElementType; color: string }> = {
  reuse: { label: 'Reuse', icon: RefreshCw, color: 'text-green-400 bg-green-500/20' },
  update: { label: 'Update', icon: Edit3, color: 'text-amber-400 bg-amber-500/20' },
  new: { label: 'New', icon: Plus, color: 'text-blue-400 bg-blue-500/20' },
  exclude: { label: 'Exclude', icon: AlertCircle, color: 'text-slate-400 bg-slate-500/20' },
};

const CONFIDENCE_CONFIG: Record<ConfidenceLevel, { label: string; color: string }> = {
  high: { label: 'High', color: 'text-green-400' },
  medium: { label: 'Medium', color: 'text-amber-400' },
  low: { label: 'Low', color: 'text-red-400' },
};

function ActionBadge({ action }: { action: RecommendationAction }) {
  const config = ACTION_CONFIG[action];
  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${config?.color ?? ''}`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}

function ConfidenceIndicator({ level, score }: { level: ConfidenceLevel; score: number }) {
  const config = CONFIDENCE_CONFIG[level];
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-surface-elevated rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${
            level === 'high' ? 'bg-green-500' : level === 'medium' ? 'bg-amber-500' : 'bg-red-500'
          }`}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className={`text-xs ${config?.color ?? ''}`}>{score}%</span>
    </div>
  );
}

function RecommendationCard({
  recommendation,
  onAccept,
  onModify,
  onReject,
}: {
  recommendation: DocumentRecommendation;
  onAccept: () => void;
  onModify: () => void;
  onReject: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  
  return (
    <div className="bg-surface-card border border-border rounded-lg overflow-hidden">
      {/* Header */}
      <div
        className="p-3 cursor-pointer hover:bg-surface-elevated transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <button className="text-text-muted">
              {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs text-text-muted font-mono">{recommendation.sectionId}</span>
                <ActionBadge action={recommendation.action} />
              </div>
              <h4 className="text-sm font-medium text-text-primary truncate">
                {recommendation.sectionName}
              </h4>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ConfidenceIndicator level={recommendation.confidence} score={recommendation.confidenceScore} />
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="px-3 pb-3 border-t border-border pt-3 ml-7">
          {/* Reason */}
          <div className="mb-3">
            <div className="flex items-center gap-1 text-xs text-text-muted mb-1">
              <Lightbulb className="w-3 h-3" />
              AI Reasoning
            </div>
            <p className="text-sm text-text-secondary">{recommendation.reason}</p>
          </div>

          {/* Source Document */}
          {recommendation.sourceDocumentId && (
            <div className="mb-3 p-2 bg-surface-elevated rounded-lg">
              <div className="text-xs text-text-muted mb-1">Source Document</div>
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-accent-blue" />
                <span className="text-sm text-text-primary">{recommendation.sourceDocumentName}</span>
                <span className="text-xs text-text-muted">{recommendation.sourceDocumentVersion}</span>
                <span className="text-xs text-text-muted">from {recommendation.sourceSequence}</span>
              </div>
            </div>
          )}

          {/* For new/update: Author & Time */}
          {(recommendation.action === 'new' || recommendation.action === 'update') && (
            <div className="flex items-center gap-4 mb-3 text-xs text-text-muted">
              {recommendation.suggestedAuthor && (
                <span className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  {recommendation.suggestedAuthor}
                </span>
              )}
              {recommendation.estimatedHours && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  ~{recommendation.estimatedHours}h estimated
                </span>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={onAccept}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-accent-green rounded hover:bg-accent-green/90 transition-colors"
            >
              <ThumbsUp className="w-3 h-3" />
              Accept
            </button>
            <button
              onClick={onModify}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-text-secondary bg-surface-elevated rounded hover:bg-surface-card transition-colors"
            >
              <Edit3 className="w-3 h-3" />
              Modify
            </button>
            <button
              onClick={onReject}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/10 rounded transition-colors"
            >
              <ThumbsDown className="w-3 h-3" />
              Reject
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function GapCard({ gap }: { gap: ContentGap }) {
  const severityConfig = {
    critical: { color: 'text-red-400 bg-red-500/20 border-red-500/30', icon: AlertCircle },
    recommended: { color: 'text-amber-400 bg-amber-500/20 border-amber-500/30', icon: AlertTriangle },
    optional: { color: 'text-blue-400 bg-blue-500/20 border-blue-500/30', icon: Lightbulb },
  };
  const config = severityConfig[gap.severity];
  const Icon = config.icon;

  return (
    <div className={`p-3 rounded-lg border ${config?.color ?? ''}`}>
      <div className="flex items-start gap-2">
        <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono">{gap.sectionId}</span>
            <span className="text-sm font-medium">{gap.sectionName}</span>
          </div>
          <p className="text-xs text-text-secondary mb-2">{gap.requirement}</p>
          {gap.aiSuggestion && (
            <div className="p-2 bg-surface-elevated rounded text-xs text-text-muted">
              <span className="text-accent-purple">💡 AI Suggestion:</span> {gap.aiSuggestion}
            </div>
          )}
          <button className="mt-2 text-xs text-accent-blue hover:underline flex items-center gap-1">
            <Plus className="w-3 h-3" />
            Create & Assign
          </button>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

interface AIAssemblyAssistantProps {
  submissionId?: string;
  haqId?: string;
  onAcceptPlan?: (analysis: AIAnalysisResult) => void;
  onModifyPlan?: () => void;
  onStartFromScratch?: () => void;
}

export function AIAssemblyAssistant({
  submissionId,
  haqId,
  onAcceptPlan,
  onModifyPlan,
  onStartFromScratch,
}: AIAssemblyAssistantProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AIAnalysisResult | null>(null);
  const [acceptedCount, setAcceptedCount] = useState(0);

  // Simulate analysis
  const runAnalysis = useCallback(async () => {
    setIsAnalyzing(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    setAnalysis(MOCK_ANALYSIS);
    setIsAnalyzing(false);
  }, []);

  // Auto-run on mount if we have context
  useEffect(() => {
    if (haqId && !analysis) {
      runAnalysis();
    }
  }, [haqId, analysis, runAnalysis]);

  if (isAnalyzing) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-surface-elevated p-8">
        <div className="p-4 bg-accent-purple/20 rounded-full mb-4">
          <Sparkles className="w-8 h-8 text-accent-purple animate-pulse" />
        </div>
        <h3 className="text-lg font-semibold text-text-primary mb-2">Analyzing Content...</h3>
        <p className="text-sm text-text-muted text-center max-w-md mb-4">
          AI is reviewing the Information Request and matching it to your document library
        </p>
        <div className="flex items-center gap-2 text-xs text-text-muted">
          <Loader2 className="w-4 h-4 animate-spin" />
          Identifying reusable content...
        </div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-surface-elevated p-8">
        <div className="p-4 bg-surface-card rounded-full mb-4">
          <Sparkles className="w-8 h-8 text-text-muted" />
        </div>
        <h3 className="text-lg font-semibold text-text-primary mb-2">AI Assembly Assistant</h3>
        <p className="text-sm text-text-muted text-center max-w-md mb-6">
          Let AI analyze your HAQ or content plan to recommend documents, identify reusable content, and flag gaps.
        </p>
        <button
          onClick={runAnalysis}
          className="px-4 py-2 bg-accent-purple text-white rounded-lg hover:bg-accent-purple/90 flex items-center gap-2"
        >
          <Zap className="w-4 h-4" />
          Start AI Analysis
        </button>
      </div>
    );
  }

  const { summary } = analysis;

  return (
    <div className="h-full flex flex-col bg-surface-elevated">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-accent-purple/20 rounded-lg">
              <Sparkles className="w-5 h-5 text-accent-purple" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-text-primary">AI Assembly Plan</h2>
              <p className="text-xs text-text-muted">
                Based on: {analysis.sourceDocumentTitle}
              </p>
            </div>
          </div>
          <button
            onClick={runAnalysis}
            className="p-2 text-text-muted hover:text-text-primary hover:bg-surface-card rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-5 gap-3">
          <div className="p-3 bg-surface-card rounded-lg text-center">
            <div className="text-2xl font-bold text-text-primary">{summary.totalDocuments}</div>
            <div className="text-xs text-text-muted">Documents</div>
          </div>
          <div className="p-3 bg-green-500/10 rounded-lg text-center">
            <div className="text-2xl font-bold text-green-400">{summary.reuseCount}</div>
            <div className="text-xs text-green-400">Reuse</div>
          </div>
          <div className="p-3 bg-amber-500/10 rounded-lg text-center">
            <div className="text-2xl font-bold text-amber-400">{summary.updateCount}</div>
            <div className="text-xs text-amber-400">Update</div>
          </div>
          <div className="p-3 bg-blue-500/10 rounded-lg text-center">
            <div className="text-2xl font-bold text-blue-400">{summary.newCount}</div>
            <div className="text-xs text-blue-400">New</div>
          </div>
          <div className="p-3 bg-accent-purple/10 rounded-lg text-center">
            <div className="text-2xl font-bold text-accent-purple">~{summary.estimatedTimeSavedHours}h</div>
            <div className="text-xs text-accent-purple">Saved</div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 space-y-6">
        {/* Gaps Alert */}
        {analysis.gaps.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400" />
              Content Gaps ({analysis.gaps.length})
            </h3>
            {analysis.gaps.map(gap => (
              <GapCard key={gap.id} gap={gap} />
            ))}
          </div>
        )}

        {/* Recommendations */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
            <Target className="w-4 h-4 text-accent-blue" />
            Document Recommendations ({analysis.recommendations.length})
          </h3>
          {analysis.recommendations.map(rec => (
            <RecommendationCard
              key={rec.id}
              recommendation={rec}
              onAccept={() => setAcceptedCount(c => c + 1)}
              onModify={() => {}}
              onReject={() => {}}
            />
          ))}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="p-4 border-t border-border bg-surface-card">
        <div className="flex items-center justify-between">
          <div className="text-xs text-text-muted">
            {acceptedCount > 0 && (
              <span className="text-accent-green">{acceptedCount} accepted</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onStartFromScratch}
              className="px-4 py-2 text-sm text-text-secondary hover:bg-surface-elevated rounded-lg transition-colors"
            >
              Start Fresh
            </button>
            <button
              onClick={onModifyPlan}
              className="px-4 py-2 text-sm text-text-primary bg-surface-elevated rounded-lg hover:bg-surface-card transition-colors"
            >
              Modify Plan
            </button>
            <button
              onClick={() => onAcceptPlan?.(analysis)}
              className="px-4 py-2 text-sm font-medium text-white bg-accent-purple rounded-lg hover:bg-accent-purple/90 transition-colors flex items-center gap-2"
            >
              Accept AI Plan
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AIAssemblyAssistant;
