
import { useState, useEffect } from 'react';
import {
  Brain,
  Search,
  CheckCircle,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Copy,
  Loader2,
  Sparkles,
  FileText,
  Link2,
  HelpCircle,
  Zap,
  Scale,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { useSafetyIntelligence, type MedDRASuggestion, type SimilarCaseResult } from '@/hooks/useSafetyIntelligence';

// ============================================================================
// TYPES
// ============================================================================

interface SafetyAIPanelProps {
  mode: 'meddra' | 'causality' | 'similar-cases';
  // MedDRA mode props
  verbatimTerm?: string;
  onSelectMedDRA?: (suggestion: MedDRASuggestion) => void;
  // Causality mode props
  drugName?: string;
  reactionTerm?: string;
  timeToOnset?: string;
  dechallenge?: 'positive' | 'negative' | 'not-done' | 'unknown';
  rechallenge?: 'positive' | 'negative' | 'not-done' | 'unknown';
  onCausalityResult?: (assessment: string, confidence: number) => void;
  // Similar cases mode props
  soc?: string;
  seriousness?: 'serious' | 'non-serious';
  onViewCase?: (caseResult: SimilarCaseResult) => void;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const getConfidenceColor = (confidence: number) => {
  if (confidence >= 90) return 'text-green-400';
  if (confidence >= 70) return 'text-blue-400';
  if (confidence >= 50) return 'text-amber-400';
  return 'text-slate-400';
};

const getConfidenceBadgeColor = (confidence: number): 'green' | 'blue' | 'amber' | 'slate' => {
  if (confidence >= 90) return 'green';
  if (confidence >= 70) return 'blue';
  if (confidence >= 50) return 'amber';
  return 'slate';
};

const getCausalityColor = (assessment: string): 'red' | 'amber' | 'blue' | 'slate' => {
  switch (assessment.toLowerCase()) {
    case 'certain': return 'red';
    case 'probable': return 'amber';
    case 'possible': return 'blue';
    default: return 'slate';
  }
};

const getMatchTypeLabel = (matchType: string) => {
  switch (matchType) {
    case 'exact': return 'Exact match';
    case 'synonym': return 'Synonym';
    case 'semantic': return 'Related term';
    default: return matchType;
  }
};

// ============================================================================
// MEDDRA SUGGESTION CARD
// ============================================================================

function MedDRASuggestionCard({
  suggestion,
  onSelect,
}: {
  suggestion: MedDRASuggestion;
  onSelect?: (suggestion: MedDRASuggestion) => void;
}) {
  return (
    <div className="bg-surface-card border border-border rounded-lg p-3 hover:border-accent-blue/50 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-text-primary">{suggestion.pt}</span>
            <Badge color={getConfidenceBadgeColor(suggestion.confidence)} size="xs">
              {suggestion.confidence}%
            </Badge>
          </div>
          <div className="text-xs text-text-muted mb-1">
            Code: {suggestion.ptCode}
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-text-muted">SOC:</span>
            <span className="text-text-secondary">{suggestion.soc}</span>
          </div>
          <div className="mt-1">
            <span className="text-xs px-1.5 py-0.5 bg-surface rounded text-text-muted">
              {getMatchTypeLabel(suggestion.matchType)}
            </span>
          </div>
        </div>
        {onSelect && (
          <button
            onClick={() => onSelect(suggestion)}
            className="px-3 py-1.5 bg-accent-blue text-white text-xs rounded hover:bg-accent-blue/80 transition-colors flex items-center gap-1"
          >
            <CheckCircle className="w-3 h-3" />
            Select
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// SIMILAR CASE CARD
// ============================================================================

function SimilarCaseCard({
  result,
  isExpanded,
  onToggle,
  onView,
}: {
  result: SimilarCaseResult;
  isExpanded: boolean;
  onToggle: () => void;
  onView?: (result: SimilarCaseResult) => void;
}) {
  const { case: historicalCase, score, matchReasons } = result;
  
  return (
    <div className="bg-surface-card border border-border rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 text-left hover:bg-surface/50 transition-colors"
      >
        <div className="flex items-start gap-3">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-text-muted flex-shrink-0 mt-0.5" />
          ) : (
            <ChevronRight className="w-4 h-4 text-text-muted flex-shrink-0 mt-0.5" />
          )}
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium text-text-primary">
                {historicalCase.caseNumber}
              </span>
              <Badge color={getCausalityColor(historicalCase.causality)} size="xs">
                {historicalCase.causality}
              </Badge>
              <Badge color={historicalCase.seriousness === 'serious' ? 'red' : 'slate'} size="xs">
                {historicalCase.seriousness}
              </Badge>
            </div>
            
            <div className="text-xs text-text-secondary mb-1">
              {historicalCase.drugName} → {historicalCase.reactionTerm}
            </div>
            
            <div className="flex items-center gap-2">
              <span className={`text-xs font-medium ${getConfidenceColor(score)}`}>
                {score}% match
              </span>
              <span className="text-xs text-text-muted">
                {matchReasons.join(' • ')}
              </span>
            </div>
          </div>
        </div>
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 pt-2 border-t border-border bg-surface/30">
          {/* Case Details */}
          <div className="grid grid-cols-2 gap-3 mb-3 text-xs">
            <div>
              <span className="text-text-muted">Drug Class:</span>
              <span className="text-text-secondary ml-1">{historicalCase.drugClass}</span>
            </div>
            <div>
              <span className="text-text-muted">Time to Onset:</span>
              <span className="text-text-secondary ml-1">{historicalCase.timeToOnset}</span>
            </div>
            <div>
              <span className="text-text-muted">Outcome:</span>
              <span className="text-text-secondary ml-1">{historicalCase.outcome}</span>
            </div>
            <div>
              <span className="text-text-muted">Dechallenge:</span>
              <span className="text-text-secondary ml-1">{historicalCase.dechallenge}</span>
            </div>
          </div>

          {/* Narrative Summary */}
          <div className="bg-surface rounded-lg p-3 mb-3">
            <div className="text-xs text-text-muted mb-1">Case Narrative:</div>
            <p className="text-xs text-text-secondary leading-relaxed">
              {historicalCase.narrativeSummary}
            </p>
          </div>

          {/* Regulatory Action */}
          {historicalCase.regulatoryAction && (
            <div className="flex items-center gap-2 text-xs">
              <AlertTriangle className="w-3 h-3 text-amber-400" />
              <span className="text-amber-400">{historicalCase.regulatoryAction}</span>
            </div>
          )}

          {/* Actions */}
          {onView && (
            <div className="mt-3 pt-3 border-t border-border">
              <button
                onClick={() => onView(result)}
                className="text-xs text-accent-blue hover:underline flex items-center gap-1"
              >
                <ExternalLink className="w-3 h-3" />
                View full case
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function SafetyAIPanel({
  mode,
  verbatimTerm,
  onSelectMedDRA,
  drugName,
  reactionTerm,
  timeToOnset,
  dechallenge,
  rechallenge,
  onCausalityResult,
  soc,
  seriousness,
  onViewCase,
}: SafetyAIPanelProps) {
  const [expandedCaseId, setExpandedCaseId] = useState<string | null>(null);
  
  const {
    // MedDRA
    meddraResult,
    suggestMedDRA,
    meddraStatus,
    // Causality
    causalityResult,
    assessCausality,
    causalityStatus,
    // Similar cases
    similarCasesResult,
    findSimilarCases,
    similarCasesStatus,
    // General
    error,
  } = useSafetyIntelligence();

  // Auto-trigger based on mode and props
  useEffect(() => {
    if (mode === 'meddra' && verbatimTerm && verbatimTerm.length >= 3) {
      suggestMedDRA(verbatimTerm);
    }
  }, [mode, verbatimTerm, suggestMedDRA]);

  useEffect(() => {
    if (mode === 'causality' && drugName && reactionTerm) {
      assessCausality({
        drugName,
        reactionTerm,
        timeToOnset,
        dechallenge,
        rechallenge,
      });
    }
  }, [mode, drugName, reactionTerm, timeToOnset, dechallenge, rechallenge, assessCausality]);

  useEffect(() => {
    if (mode === 'similar-cases' && (drugName || reactionTerm)) {
      findSimilarCases({
        drugName,
        reactionTerm,
        soc,
        seriousness,
        topK: 5,
      });
    }
  }, [mode, drugName, reactionTerm, soc, seriousness, findSimilarCases]);

  // Notify parent of causality result
  useEffect(() => {
    if (causalityResult && onCausalityResult) {
      onCausalityResult(causalityResult.assessment, causalityResult.confidence);
    }
  }, [causalityResult, onCausalityResult]);

  const isLoading = meddraStatus === 'loading' || causalityStatus === 'loading' || similarCasesStatus === 'loading';

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Brain className="w-4 h-4 text-accent-purple" />
        <h3 className="text-sm font-semibold text-text-primary">
          {mode === 'meddra' && 'MedDRA Coding Assistant'}
          {mode === 'causality' && 'Causality Assessment'}
          {mode === 'similar-cases' && 'Similar Historical Cases'}
        </h3>
        {isLoading && <Loader2 className="w-4 h-4 animate-spin text-accent-purple" />}
      </div>

      {/* Error State */}
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
          <div className="flex items-center gap-2 text-sm text-red-400">
            <AlertTriangle className="w-4 h-4" />
            {error}
          </div>
        </div>
      )}

      {/* ==================== MEDDRA MODE ==================== */}
      {mode === 'meddra' && (
        <>
          {/* Input Display */}
          {verbatimTerm && (
            <div className="text-xs text-text-muted">
              Searching for: <span className="text-text-primary font-medium">"{verbatimTerm}"</span>
            </div>
          )}

          {/* Loading State */}
          {meddraStatus === 'loading' && (
            <div className="py-6 text-center">
              <Loader2 className="w-6 h-6 animate-spin text-accent-purple mx-auto mb-2" />
              <p className="text-sm text-text-muted">Finding MedDRA terms...</p>
            </div>
          )}

          {/* Results */}
          {meddraStatus === 'success' && meddraResult && (
            <div className="space-y-2">
              {meddraResult.suggestions.length > 0 ? (
                meddraResult.suggestions.map((suggestion, idx) => (
                  <MedDRASuggestionCard
                    key={`${suggestion.ptCode}-${idx}`}
                    suggestion={suggestion}
                    onSelect={onSelectMedDRA}
                  />
                ))
              ) : (
                <div className="py-6 text-center text-sm text-text-muted">
                  No matching MedDRA terms found
                </div>
              )}
            </div>
          )}

          {/* Empty State */}
          {meddraStatus === 'idle' && !verbatimTerm && (
            <div className="py-6 text-center">
              <Search className="w-8 h-8 text-text-muted mx-auto mb-2" />
              <p className="text-sm text-text-muted">Enter a verbatim term to find MedDRA codes</p>
            </div>
          )}
        </>
      )}

      {/* ==================== CAUSALITY MODE ==================== */}
      {mode === 'causality' && (
        <>
          {/* Loading State */}
          {causalityStatus === 'loading' && (
            <div className="py-6 text-center">
              <Loader2 className="w-6 h-6 animate-spin text-accent-purple mx-auto mb-2" />
              <p className="text-sm text-text-muted">Assessing causality...</p>
            </div>
          )}

          {/* Results */}
          {causalityStatus === 'success' && causalityResult && (
            <div className="space-y-4">
              {/* Assessment Badge */}
              <div className="bg-surface-card border border-border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Scale className="w-5 h-5 text-accent-purple" />
                    <div>
                      <div className="text-sm font-medium text-text-primary">
                        WHO-UMC Assessment
                      </div>
                      <div className="text-xs text-text-muted">
                        {causalityResult.drugName} → {causalityResult.reactionTerm}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge color={getCausalityColor(causalityResult.assessment)} size="sm">
                      {causalityResult.whoUmcCategory}
                    </Badge>
                    <div className="text-xs text-text-muted mt-1">
                      {causalityResult.confidence}% confidence
                    </div>
                  </div>
                </div>

                {/* Naranjo Score */}
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs text-text-muted">Naranjo Score:</span>
                  <span className={`text-sm font-semibold ${getConfidenceColor(causalityResult.naranjoScore * 10)}`}>
                    {causalityResult.naranjoScore}
                  </span>
                  <span className="text-xs text-text-muted">
                    ({causalityResult.naranjoScore >= 9 ? 'Definite' : 
                      causalityResult.naranjoScore >= 5 ? 'Probable' : 
                      causalityResult.naranjoScore >= 1 ? 'Possible' : 'Doubtful'})
                  </span>
                </div>

                {/* Reasoning */}
                <div className="space-y-1">
                  <div className="text-xs font-medium text-text-muted">Assessment Reasoning:</div>
                  {causalityResult.reasoning.map((reason, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs">
                      <ChevronRight className="w-3 h-3 text-accent-purple mt-0.5 flex-shrink-0" />
                      <span className="text-text-secondary">{reason}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Disclaimer */}
              <div className="flex items-start gap-2 text-xs text-text-muted">
                <HelpCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                <span>AI-assisted assessment based on WHO-UMC criteria. Final determination requires clinical review.</span>
              </div>
            </div>
          )}

          {/* Empty State */}
          {causalityStatus === 'idle' && (!drugName || !reactionTerm) && (
            <div className="py-6 text-center">
              <Scale className="w-8 h-8 text-text-muted mx-auto mb-2" />
              <p className="text-sm text-text-muted">Select a drug and reaction to assess causality</p>
            </div>
          )}
        </>
      )}

      {/* ==================== SIMILAR CASES MODE ==================== */}
      {mode === 'similar-cases' && (
        <>
          {/* Loading State */}
          {similarCasesStatus === 'loading' && (
            <div className="py-6 text-center">
              <Loader2 className="w-6 h-6 animate-spin text-accent-purple mx-auto mb-2" />
              <p className="text-sm text-text-muted">Searching historical cases...</p>
            </div>
          )}

          {/* Results */}
          {similarCasesStatus === 'success' && similarCasesResult && (
            <div className="space-y-2">
              <div className="text-xs text-text-muted mb-2">
                Found {similarCasesResult.results.length} similar cases from {similarCasesResult.totalCases} in database
              </div>
              
              {similarCasesResult.results.length > 0 ? (
                similarCasesResult.results.map((result) => (
                  <SimilarCaseCard
                    key={result.case.id}
                    result={result}
                    isExpanded={expandedCaseId === result.case.id}
                    onToggle={() => setExpandedCaseId(
                      expandedCaseId === result.case.id ? null : result.case.id
                    )}
                    onView={onViewCase}
                  />
                ))
              ) : (
                <div className="py-6 text-center text-sm text-text-muted">
                  No similar cases found
                </div>
              )}
            </div>
          )}

          {/* Empty State */}
          {similarCasesStatus === 'idle' && !drugName && !reactionTerm && (
            <div className="py-6 text-center">
              <FileText className="w-8 h-8 text-text-muted mx-auto mb-2" />
              <p className="text-sm text-text-muted">Enter search criteria to find similar cases</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default SafetyAIPanel;
