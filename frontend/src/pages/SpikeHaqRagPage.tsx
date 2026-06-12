

import { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, 
  Play, 
  Square, 
  RotateCcw, 
  Activity, 
  Clock, 
  FileText, 
  Search,
  CheckCircle,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { useHAQRAG, type SimilarResponse } from '@/hooks/useHAQRAG';

/**
 * HAQ RAG SPIKE
 * 
 * Proves RAG-powered HAQ response generation works.
 * Navigate to: http://localhost:3000/spike/haq-rag
 * 
 * Flow:
 * 1. Enter a regulatory question
 * 2. System finds similar historical questions
 * 3. Claude synthesizes a draft response using historical patterns
 */

// Sample questions for testing
const SAMPLE_QUESTIONS = [
  {
    label: 'CMC - Crystallization Process',
    question: 'Please provide additional information regarding the control strategy for the drug substance manufacturing process. Specifically, clarify the critical process parameters (CPPs) and their acceptable ranges for the final crystallization step.',
    discipline: 'CMC',
    ctdSection: '3.2.S.2.4',
  },
  {
    label: 'Clinical - Dose Modifications',
    question: 'The protocol allowed for dose modifications in patients experiencing Grade 2 or higher adverse events. Please provide a summary of the dose modification patterns observed and their impact on efficacy outcomes.',
    discipline: 'Clinical',
    ctdSection: '5.3.5.1',
  },
  {
    label: 'Biometrics - Missing Data',
    question: 'Please clarify the handling of missing data in the primary efficacy analysis. The statistical analysis plan indicates that multiple imputation was used, but details on the imputation model assumptions are needed.',
    discipline: 'Biometrics',
    ctdSection: '5.3.5.1',
  },
  {
    label: 'Nonclinical - Liver Findings',
    question: 'The 2-year rat carcinogenicity study showed an increased incidence of hepatocellular adenomas in high-dose males. Please discuss the relevance of this finding to humans.',
    discipline: 'Nonclinical',
    ctdSection: '2.6.6',
  },
  {
    label: 'CMC - Dissolution Spec',
    question: 'The dissolution specification appears less stringent than batch data suggests. Please justify the proposed specification or consider tightening based on manufacturing experience.',
    discipline: 'CMC',
    ctdSection: '3.2.P.5.1',
  },
];

export default function HAQRAGSpikePage() {
  const [questionText, setQuestionText] = useState('');
  const [discipline, setDiscipline] = useState<string>('');
  const [ctdSection, setCtdSection] = useState('');
  const [expandedSimilar, setExpandedSimilar] = useState<string | null>(null);
  
  const contentRef = useRef<HTMLDivElement>(null);

  const {
    state,
    metrics,
    generateDraft,
    cancel,
    reset,
    isSearching,
    isStreaming,
    isComplete,
    isError,
    isIdle,
  } = useHAQRAG({
    onSimilarFound: (responses) => {
      console.log('Found similar responses:', responses.length);
    },
    onComplete: (draft, similar) => {
      console.log('Generation complete:', draft.length, 'chars,', similar.length, 'similar');
    },
  });

  // Auto-scroll during streaming
  useEffect(() => {
    if (contentRef.current && isStreaming) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [state.generatedDraft, isStreaming]);

  const handleGenerate = () => {
    if (!questionText.trim()) return;
    
    generateDraft({
      questionText,
      discipline: discipline || undefined,
      ctdSection: ctdSection || undefined,
    });
  };

  const handleSampleQuestion = (sample: typeof SAMPLE_QUESTIONS[0]) => {
    setQuestionText(sample.question);
    setDiscipline(sample.discipline);
    setCtdSection(sample.ctdSection);
  };

  const handleReset = () => {
    reset();
    setQuestionText('');
    setDiscipline('');
    setCtdSection('');
    setExpandedSimilar(null);
  };

  const getStatusColor = () => {
    if (isIdle) return 'bg-gray-500';
    if (isSearching) return 'bg-amber-500 animate-pulse';
    if (isStreaming) return 'bg-blue-500 animate-pulse';
    if (isComplete) return 'bg-emerald-500';
    if (isError) return 'bg-red-500';
    return 'bg-gray-500';
  };

  const getStatusText = () => {
    if (isIdle) return 'Ready';
    if (isSearching) return 'Searching historical responses...';
    if (isStreaming) return 'Generating draft...';
    if (isComplete) return 'Complete';
    if (isError) return 'Error';
    if (state.status === 'cancelled') return 'Cancelled';
    return 'Ready';
  };

  const getOutcomeColor = (outcome: string) => {
    switch (outcome) {
      case 'accepted': return 'text-emerald-400';
      case 'follow-up': return 'text-amber-400';
      case 'rejected': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-blue-500/20">
              <Search className="w-6 h-6 text-blue-400" />
            </div>
            <h1 className="text-2xl font-bold">HAQ RAG Spike</h1>
          </div>
          <p className="text-gray-400">
            Retrieval-Augmented Generation for Health Authority Question responses.
            Find similar historical responses and synthesize drafts using Claude.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Input */}
          <div className="lg:col-span-2 space-y-6">
            {/* Question Input */}
            <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Health Authority Question
              </label>
              <textarea
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                placeholder="Enter the question text from the health authority..."
                className="w-full h-32 bg-gray-800 border border-gray-700 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                disabled={isSearching || isStreaming}
              />
              
              {/* Metadata */}
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">
                    Discipline
                  </label>
                  <select
                    value={discipline}
                    onChange={(e) => setDiscipline(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isSearching || isStreaming}
                  >
                    <option value="">All disciplines</option>
                    <option value="CMC">CMC</option>
                    <option value="Clinical">Clinical</option>
                    <option value="Nonclinical">Nonclinical</option>
                    <option value="Biometrics">Biometrics</option>
                    <option value="Labeling">Labeling</option>
                    <option value="Safety">Safety</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">
                    CTD Section
                  </label>
                  <input
                    type="text"
                    value={ctdSection}
                    onChange={(e) => setCtdSection(e.target.value)}
                    placeholder="e.g., 3.2.S.2.4"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isSearching || isStreaming}
                  />
                </div>
              </div>

              {/* Sample Questions */}
              <div className="mt-4">
                <label className="block text-xs font-medium text-gray-400 mb-2">
                  Sample Questions
                </label>
                <div className="flex flex-wrap gap-2">
                  {SAMPLE_QUESTIONS.map((sample, i) => (
                    <button
                      key={i}
                      onClick={() => handleSampleQuestion(sample)}
                      className="px-3 py-1 text-xs bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-full transition-colors"
                      disabled={isSearching || isStreaming}
                    >
                      {sample.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-4">
              {isIdle || isComplete || isError || state.status === 'cancelled' ? (
                <button
                  onClick={handleGenerate}
                  disabled={!questionText.trim()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 rounded-lg font-medium flex items-center gap-2 transition-colors"
                >
                  <Play className="w-4 h-4" />
                  Generate Draft
                </button>
              ) : (
                <button
                  onClick={cancel}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 rounded-lg font-medium flex items-center gap-2 transition-colors"
                >
                  <Square className="w-4 h-4" />
                  Cancel
                </button>
              )}

              {(isComplete || isError || state.status === 'cancelled') && (
                <button
                  onClick={handleReset}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium flex items-center gap-2 transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  Reset
                </button>
              )}

              {/* Status Badge */}
              <div className="flex items-center gap-2 ml-auto">
                <div className={`w-3 h-3 rounded-full ${getStatusColor()}`} />
                <span className="text-sm text-gray-300">{getStatusText()}</span>
              </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
                <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                  <Search className="w-4 h-4" />
                  Similar
                </div>
                <div className="text-2xl font-mono font-bold">
                  {metrics.similarCount}
                </div>
              </div>
              
              <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
                <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                  <Clock className="w-4 h-4" />
                  Search
                </div>
                <div className="text-2xl font-mono font-bold">
                  {metrics.searchTimeMs > 0 ? `${metrics.searchTimeMs}ms` : '—'}
                </div>
              </div>
              
              <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
                <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                  <Activity className="w-4 h-4" />
                  Total
                </div>
                <div className="text-2xl font-mono font-bold">
                  {(metrics.totalTimeMs / 1000).toFixed(1)}s
                </div>
              </div>
              
              <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
                <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                  <FileText className="w-4 h-4" />
                  Output
                </div>
                <div className="text-2xl font-mono font-bold">
                  {metrics.wordCount}
                  <span className="text-sm text-gray-500 ml-1">words</span>
                </div>
              </div>
            </div>

            {/* Error Display */}
            {state.error && (
              <div className="p-4 bg-red-900/30 border border-red-700 rounded-lg">
                <div className="flex items-center gap-2 font-medium text-red-400 mb-1">
                  <AlertCircle className="w-4 h-4" />
                  Error
                </div>
                <div className="text-sm text-red-300">{state.error}</div>
              </div>
            )}

            {/* Generated Draft */}
            <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
              <div className="px-4 py-2 border-b border-gray-800 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Sparkles className="w-4 h-4 text-blue-400" />
                  Generated Draft
                </div>
                {isComplete && state.generatedDraft && (
                  <div className="text-xs text-emerald-400 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    Ready for review
                  </div>
                )}
              </div>

              <div
                ref={contentRef}
                className="p-4 h-96 overflow-auto font-mono text-sm leading-relaxed"
              >
                {state.generatedDraft ? (
                  <div className="whitespace-pre-wrap prose prose-invert prose-sm max-w-none">
                    {state.generatedDraft}
                    {isStreaming && (
                      <span className="inline-block w-2 h-4 bg-blue-400 ml-0.5 animate-pulse" />
                    )}
                  </div>
                ) : isIdle ? (
                  <div className="text-gray-500 italic">
                    Enter a question above and click "Generate Draft" to create a response...
                  </div>
                ) : isSearching ? (
                  <div className="text-amber-400 flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                    Searching historical response library...
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {/* Right Column - Similar Responses */}
          <div className="space-y-4">
            <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-800">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Search className="w-4 h-4 text-blue-400" />
                  Similar Historical Responses
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {state.similarResponses.length} matches found
                </div>
              </div>

              <div className="divide-y divide-gray-800 max-h-[600px] overflow-auto">
                {state.similarResponses.length > 0 ? (
                  state.similarResponses.map((similar) => (
                    <SimilarResponseCard
                      key={similar.id}
                      response={similar}
                      isExpanded={expandedSimilar === similar.id}
                      onToggle={() => setExpandedSimilar(
                        expandedSimilar === similar.id ? null : similar.id
                      )}
                    />
                  ))
                ) : (
                  <div className="p-4 text-center text-gray-500 text-sm">
                    {isSearching ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                        Searching...
                      </div>
                    ) : (
                      'No similar responses found yet'
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Library Stats */}
            <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
              <div className="text-sm font-medium mb-3">Response Library</div>
              <div className="space-y-2 text-xs text-gray-400">
                <div className="flex justify-between">
                  <span>Total responses:</span>
                  <span className="text-white">12</span>
                </div>
                <div className="flex justify-between">
                  <span>Disciplines:</span>
                  <span className="text-white">5</span>
                </div>
                <div className="flex justify-between">
                  <span>Accepted rate:</span>
                  <span className="text-emerald-400">100%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Technical Info */}
        <div className="mt-6 text-xs text-gray-500">
          <div className="font-medium mb-2">Technical Details:</div>
          <ul className="space-y-1">
            <li>• API Endpoint: POST /api/ai/haq-rag</li>
            <li>• Retrieval: TF-IDF keyword matching with domain term boosting</li>
            <li>• Synthesis: Claude Sonnet 4 with historical context injection</li>
            <li>• Streaming: Server-Sent Events (SSE)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// SIMILAR RESPONSE CARD COMPONENT
// ============================================================================

function SimilarResponseCard({
  response,
  isExpanded,
  onToggle,
}: {
  response: SimilarResponse;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const getOutcomeColor = (outcome: string) => {
    switch (outcome) {
      case 'accepted': return 'text-emerald-400 bg-emerald-400/10';
      case 'follow-up': return 'text-amber-400 bg-amber-400/10';
      case 'rejected': return 'text-red-400 bg-red-400/10';
      default: return 'text-gray-400 bg-gray-400/10';
    }
  };

  return (
    <div className="p-3">
      <button
        onClick={onToggle}
        className="w-full text-left"
      >
        <div className="flex items-start gap-2">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-gray-500 flex-shrink-0 mt-0.5" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-500 flex-shrink-0 mt-0.5" />
          )}
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-medium text-blue-400">
                {response.score}% match
              </span>
              <span className={`text-xs px-1.5 py-0.5 rounded ${getOutcomeColor(response.outcome)}`}>
                {response.outcome}
              </span>
            </div>
            
            <div className="text-sm text-gray-300 line-clamp-2">
              {response.questionText}
            </div>
            
            <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
              <span>{response.discipline}</span>
              <span>•</span>
              <span>{response.applicationNumber}</span>
            </div>
          </div>
        </div>
      </button>

      {isExpanded && (
        <div className="mt-3 ml-6 space-y-2">
          {/* Matched Terms */}
          <div>
            <div className="text-xs text-gray-500 mb-1">Matched terms:</div>
            <div className="flex flex-wrap gap-1">
              {response.matchedTerms.map((term, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 text-xs bg-blue-500/20 text-blue-300 rounded"
                >
                  {term}
                </span>
              ))}
            </div>
          </div>

          {/* Product Info */}
          <div className="text-xs text-gray-400">
            <span className="text-gray-500">Product:</span> {response.productName}
          </div>

          {/* Response Preview */}
          {response.responseText && (
            <div className="text-xs text-gray-400 bg-gray-800/50 rounded p-2 max-h-32 overflow-auto">
              {response.responseText.substring(0, 300)}...
            </div>
          )}
        </div>
      )}
    </div>
  );
}
