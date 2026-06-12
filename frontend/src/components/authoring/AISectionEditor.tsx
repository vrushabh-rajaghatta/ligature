

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  Wand2, RefreshCw, CheckCircle, AlertCircle, Link2, FileText,
  ChevronDown, ChevronRight, Sparkles, BookOpen, Copy, Check,
  Info, Clock, Save, X, Zap, Target, AlertTriangle, History,
  ExternalLink, ShieldCheck, Eye, Edit3, Pause, Activity, DollarSign
} from 'lucide-react';
import { DocumentSection, DocumentType } from '@/types/authoring';
import { getAIDocumentConfig, getSectionAIConfig, SourceType } from '@/config/ai-authoring-config';
import { useAuthoringStore, SourceDocument, Citation } from '@/store/useAuthoringStore';
import { useAppStore } from '@/store/useAppStore';
import { useAuditStore } from '@/store/useAuditStore';
import { useToast } from '@/components/ui/Toast';
import { logger } from '@/lib/logger';
import { 
  generateSectionContent, 
  checkContentQuality,
  processStreamedContent
} from '@/services/ai-authoring-service';
import { useSectionGeneration, extractSectionCitations } from '@/hooks/useSectionGeneration';
import { CompactDocumentPreview } from './ProfessionalDocumentPreview';
import { formatAsAMAContent, AMA_CONTENT_STYLES } from '@/utils/ama-formatter';

interface AISectionEditorProps {
  section: DocumentSection;
  documentType: DocumentType;
  productName: string;
  studyName?: string;
  indication?: string;
  onContentAccepted?: (content: string, citations: Citation[]) => void;
  onClose?: () => void;
}

export function AISectionEditor({
  section,
  documentType,
  productName,
  studyName,
  indication,
  onContentAccepted,
  onClose,
}: AISectionEditorProps) {
  const toast = useToast();
  const availableSources = useAuthoringStore(s => s.availableSources);
  const selectedSourceIds = useAuthoringStore(s => s.selectedSourceIds);
  const toggleSourceSelection = useAuthoringStore(s => s.toggleSourceSelection);
  const selectAllSources = useAuthoringStore(s => s.selectAllSources);
  const clearSourceSelection = useAuthoringStore(s => s.clearSourceSelection);
  const isGenerating = useAuthoringStore(s => s.isGenerating);
  const startGeneration = useAuthoringStore(s => s.startGeneration);
  const completeGeneration = useAuthoringStore(s => s.completeGeneration);
  const failGeneration = useAuthoringStore(s => s.failGeneration);
  const getSectionDraft = useAuthoringStore(s => s.getSectionDraft);
  const acceptDraft = useAuthoringStore(s => s.acceptDraft);
  const discardDraft = useAuthoringStore(s => s.discardDraft);
  const currentDocument = useAuthoringStore(s => s.currentDocument);
  
  const logAIGeneration = useAuditStore(s => s.logAIGeneration);
  const logDraftAccepted = useAuditStore(s => s.logDraftAccepted);
  const logDraftDiscarded = useAuditStore(s => s.logDraftDiscarded);
  
  const [localContent, setLocalContent] = useState<string>('');
  const [localCitations, setLocalCitations] = useState<Citation[]>([]);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [showSourcePanel, setShowSourcePanel] = useState(true);
  const [qualityIssues, setQualityIssues] = useState<string[]>([]);
  const [qualitySuggestions, setQualitySuggestions] = useState<string[]>([]);
  const [showQualityPanel, setShowQualityPanel] = useState(false);
  const [generationTime, setGenerationTime] = useState<number | null>(null);
  const [contentViewMode, setContentViewMode] = useState<'preview' | 'edit'>('preview');
  const [useStreaming, setUseStreaming] = useState(true); // Toggle for streaming mode
  
  const generationStartTime = useRef<number>(0);
  const contentRef = useRef<HTMLDivElement>(null);
  
  // Streaming hook for real-time generation via API route
  const {
    state: streamState,
    metrics: streamMetrics,
    generate: startGeneration_API,
    cancel: cancelStreaming,
    reset: resetStreaming,
    isGenerating: isStreaming,
    isComplete: streamComplete,
  } = useSectionGeneration({
    onToken: () => {
      // Auto-scroll during streaming
      if (contentRef.current) {
        contentRef.current.scrollTop = contentRef.current.scrollHeight;
      }
    },
    onComplete: async (content) => {
      // Process citations from streamed content
      const citations = extractSectionCitations(content, selectedSources);
      setLocalCitations(citations);
      setHasGenerated(true);
      
      const genTimeMs = Date.now() - generationStartTime.current;
      setGenerationTime(genTimeMs);
      
      const wordCount = content.split(/\s+/).filter(Boolean).length;
      
      // Complete generation in store
      completeGeneration(section.id, {
        content: content,
        citations,
        generatedAt: new Date(),
        sourceIds: selectedSources.map(s => s.id),
        isAccepted: false,
        wordCount,
      });
      
      // Log to audit trail
      logAIGeneration({
        documentId: currentDocument?.id || 'unknown',
        documentType,
        documentTitle: currentDocument?.title || 'Unknown Document',
        sectionId: section.id,
        sectionNumber: section.number,
        sectionTitle: section.title,
        userId: currentUser.id,
        userName: currentUser.name,
        modelUsed: 'claude-sonnet-4-6',
        sourceDocuments: selectedSources.map(s => s.title),
        citations,
        tokensUsed: streamMetrics.tokenCount,
        generationTimeMs: genTimeMs,
        wordCount,
        isRegeneration: false,
      });
      
      // Run quality checks
      const qualityResult = await checkContentQuality(content, section, documentType);
      setQualityIssues(qualityResult.issues);
      setQualitySuggestions(qualityResult.suggestions);
      if (qualityResult.issues.length > 0) {
        setShowQualityPanel(true);
      }
      
      toast.success(`Content generated (${wordCount} words, ${citations.length} citations)`);
    },
  });
  
  const docConfig = getAIDocumentConfig(documentType);
  const sectionConfig = getSectionAIConfig(documentType, section.number);
  
  // Mock user for demo - in production would come from auth
  const currentUser = { id: 'user-1', name: 'Sarah Chen' };
  
  // Check for existing draft
  const existingDraft = getSectionDraft(section.id);
  
  useEffect(() => {
    if (existingDraft && !hasGenerated) {
      setLocalContent(existingDraft.content);
      setLocalCitations(existingDraft.citations);
      setHasGenerated(true);
    }
  }, [existingDraft, hasGenerated]);
  
  // Sync streamed content to local state when streaming completes
  useEffect(() => {
    if (streamComplete && streamState.content && !hasGenerated) {
      setLocalContent(streamState.content);
    }
  }, [streamComplete, streamState.content, hasGenerated]);
  
  // Get selected sources
  const selectedSources = availableSources.filter(s => selectedSourceIds.has(s.id));
  
  // Check if required source types are selected
  const requiredTypes = sectionConfig?.requiredSourceTypes || docConfig.requiredSources;
  const missingTypes = requiredTypes.filter(
    type => !selectedSources.some(s => s.type === type)
  );
  
  // Generate content - supports both streaming and batch modes
  const handleGenerate = useCallback(async (isRegeneration = false) => {
    if (selectedSources.length === 0) {
      toast.error('Please select at least one source document');
      return;
    }
    
    // v0.32.9 Debug logging
    logger.debug('AISectionEditor', `Generate clicked: ${documentType} - ${section.number} (${section.title}), streaming: ${useStreaming}`);
    
    startGeneration(section.id);
    generationStartTime.current = Date.now();
    setQualityIssues([]);
    setQualitySuggestions([]);
    setLocalContent('');
    setLocalCitations([]);
    
    if (useStreaming) {
      // STREAMING MODE - Real-time content generation via API route
      logger.debug('AISectionEditor', 'Using streaming mode');
      try {
        resetStreaming();
        
        // Start streaming via API - onComplete callback handles the rest
        await startGeneration_API(
          section,
          documentType,
          { productName, studyName, indication },
          selectedSources
        );
      } catch (error) {
        failGeneration();
        toast.error('Failed to start generation');
        logger.error('AISectionEditor', 'Streaming generation error', error);
      }
    } else {
      // BATCH MODE - Wait for full response (fallback)
      logger.debug('AISectionEditor', 'Using batch mode');
      try {
        const result = await generateSectionContent(
          section,
          documentType,
          { productName, studyName, indication },
          selectedSources
        );
        
        const genTimeMs = Date.now() - generationStartTime.current;
        setGenerationTime(genTimeMs);
        
        setLocalContent(result.content);
        setLocalCitations(result.citations);
        setHasGenerated(true);
        
        completeGeneration(section.id, {
          content: result.content,
          citations: result.citations,
          generatedAt: result.generatedAt,
          sourceIds: selectedSources.map(s => s.id),
          isAccepted: false,
          wordCount: result.wordCount,
        });
        
        logAIGeneration({
          documentId: currentDocument?.id || 'unknown',
          documentType,
          documentTitle: currentDocument?.title || 'Unknown Document',
          sectionId: section.id,
          sectionNumber: section.number,
          sectionTitle: section.title,
          userId: currentUser.id,
          userName: currentUser.name,
          modelUsed: result.modelUsed,
          sourceDocuments: selectedSources.map(s => s.title),
          citations: result.citations,
          tokensUsed: result.tokensUsed,
          generationTimeMs: genTimeMs,
          wordCount: result.wordCount,
          isRegeneration,
        });
        
        const qualityResult = await checkContentQuality(result.content, section, documentType);
        setQualityIssues(qualityResult.issues);
        setQualitySuggestions(qualityResult.suggestions);
        if (qualityResult.issues.length > 0) {
          setShowQualityPanel(true);
        }
        
        toast.success(`Content generated (${result.wordCount} words, ${result.citations.length} citations)`);
      } catch (error) {
        failGeneration();
        toast.error('Failed to generate content');
        logger.error('AISectionEditor', 'Generation error', error);
      }
    }
  }, [selectedSources, section, documentType, productName, studyName, indication, startGeneration, completeGeneration, failGeneration, toast, currentDocument, logAIGeneration, currentUser, useStreaming, startGeneration_API, resetStreaming]);
  
  // Accept generated content
  const [isAcceptedState, setIsAcceptedState] = useState(false);

  const handleAccept = useCallback(() => {
    const contentToAccept = localContent || streamState.content;
    acceptDraft(section.id);
    
    // Log to audit trail
    logDraftAccepted({
      documentId: currentDocument?.id || 'unknown',
      documentType,
      documentTitle: currentDocument?.title || 'Unknown Document',
      sectionId: section.id,
      sectionNumber: section.number,
      sectionTitle: section.title,
      userId: currentUser.id,
      userName: currentUser.name,
      wordCount: contentToAccept.split(/\s+/).filter(Boolean).length,
      citationCount: localCitations.length,
    });
    
    onContentAccepted?.(contentToAccept, localCitations);
    setIsAcceptedState(true);
    // Auto-close after 2.5s if user doesn't click
    setTimeout(() => { onClose?.(); }, 2500);
  }, [section.id, localContent, streamState.content, localCitations, acceptDraft, onContentAccepted, toast, currentDocument, documentType, logDraftAccepted, currentUser, onClose]);
  
  // Discard generated content
  const handleDiscard = useCallback(() => {
    // Log to audit trail
    logDraftDiscarded({
      documentId: currentDocument?.id || 'unknown',
      documentType,
      documentTitle: currentDocument?.title || 'Unknown Document',
      sectionId: section.id,
      sectionNumber: section.number,
      sectionTitle: section.title,
      userId: currentUser.id,
      userName: currentUser.name,
    });
    
    discardDraft(section.id);
    setLocalContent('');
    setLocalCitations([]);
    setHasGenerated(false);
    setQualityIssues([]);
    setQualitySuggestions([]);
    toast.info('Draft discarded');
  }, [section.id, discardDraft, toast, currentDocument, documentType, logDraftDiscarded, currentUser]);
  
  // Get confidence color
  const getConfidenceColor = (confidence: Citation['confidence']) => {
    switch (confidence) {
      case 'high': return 'bg-accent-green/20 text-accent-green border-accent-green/30';
      case 'medium': return 'bg-accent-amber/20 text-accent-amber border-accent-amber/30';
      case 'low': return 'bg-accent-red/20 text-accent-red border-accent-red/30';
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-surface-elevated rounded-xl border border-border shadow-2xl w-full max-w-6xl h-[85vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-accent-purple/20">
              <Sparkles className="w-5 h-5 text-accent-purple" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-text-primary">
                AI Section Generator
              </h2>
              <p className="text-sm text-text-muted">
                {section.number} {section.title} • {docConfig.displayName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-surface-card rounded-lg text-text-muted hover:text-text-primary"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Main content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left: Content Area */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* ICH Guidelines Bar */}
            {docConfig.ichGuidelines.length > 0 && (
              <div className="px-4 py-2 bg-accent-blue/5 border-b border-accent-blue/20 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-accent-blue" />
                <span className="text-xs text-accent-blue">
                  Following: {docConfig.ichGuidelines.map(g => `ICH ${g}`).join(', ')}
                </span>
                {docConfig.regulatoryGuidance.length > 0 && (
                  <>
                    <span className="text-accent-blue/50">•</span>
                    <span className="text-xs text-text-muted">
                      {docConfig.regulatoryGuidance.slice(0, 2).join(', ')}
                    </span>
                  </>
                )}
              </div>
            )}
            
            {/* Generate Panel (when not generated and not streaming) */}
            {!hasGenerated && !isStreaming && streamState.status === 'idle' && (
              <div className="flex-1 flex flex-col items-center justify-center p-8">
                <div className="text-center max-w-md">
                  <div className="w-16 h-16 rounded-full bg-accent-purple/20 flex items-center justify-center mx-auto mb-4">
                    <Wand2 className="w-8 h-8 text-accent-purple" />
                  </div>
                  <h3 className="text-xl font-semibold text-text-primary mb-2">
                    Generate Section Content
                  </h3>
                  <p className="text-text-muted mb-6">
                    Select source documents from the panel on the right, then click generate 
                    to create ICH-compliant content with automatic citations.
                  </p>
                  
                  {/* Status indicators */}
                  <div className="space-y-2 mb-6 text-left">
                    <div className="flex items-center gap-2 text-sm">
                      {selectedSources.length > 0 ? (
                        <CheckCircle className="w-4 h-4 text-accent-green" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-text-muted" />
                      )}
                      <span className={selectedSources.length > 0 ? 'text-text-primary' : 'text-text-muted'}>
                        {selectedSources.length} source{selectedSources.length !== 1 ? 's' : ''} selected
                      </span>
                    </div>
                    
                    {missingTypes.length > 0 && (
                      <div className="flex items-start gap-2 text-sm">
                        <AlertTriangle className="w-4 h-4 text-accent-amber mt-0.5" />
                        <span className="text-accent-amber">
                          Recommended: {missingTypes.slice(0, 2).map(t => t.replace(/-/g, ' ')).join(', ')}
                        </span>
                      </div>
                    )}
                    
                    {/* Streaming toggle */}
                    <div className="flex items-center gap-2 text-sm pt-2">
                      <button
                        onClick={() => setUseStreaming(!useStreaming)}
                        className={`relative w-10 h-5 rounded-full transition-colors ${
                          useStreaming ? 'bg-accent-purple' : 'bg-border'
                        }`}
                      >
                        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                          useStreaming ? 'translate-x-5' : 'translate-x-0.5'
                        }`} />
                      </button>
                      <span className="text-text-muted">
                        {useStreaming ? 'Real-time streaming' : 'Batch generation'}
                      </span>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => handleGenerate(false)}
                    disabled={isGenerating || selectedSources.length === 0}
                    className="px-6 py-3 bg-accent-purple text-white rounded-lg font-medium flex items-center gap-2 mx-auto disabled:opacity-50 hover:bg-accent-purple/90 transition-colors"
                  >
                    {isGenerating ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Zap className="w-5 h-5" />
                        Generate Content
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
            
            {/* STREAMING PANEL - Real-time content generation */}
            {isStreaming && (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Streaming Header */}
                <div className="px-4 py-2 border-b border-border flex items-center justify-between bg-accent-purple/5">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-2 text-sm text-accent-purple font-medium">
                      <Sparkles className="w-4 h-4 animate-pulse" />
                      Generating with Claude...
                    </span>
                    <span className="text-xs text-text-muted">
                      {streamMetrics.wordCount} words • {streamMetrics.elapsedSeconds.toFixed(1)}s
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1.5 text-xs text-accent-purple">
                      <Activity className="w-3 h-3" />
                      {streamMetrics.tokensPerSecond.toFixed(0)} tok/s
                    </span>
                    <button
                      onClick={cancelStreaming}
                      className="px-3 py-1 text-xs bg-accent-amber/20 text-accent-amber rounded hover:bg-accent-amber/30 transition-colors flex items-center gap-1"
                    >
                      <Pause className="w-3 h-3" />
                      Stop
                    </button>
                  </div>
                </div>
                
                {/* Streaming Content Area - AMA regulatory document styling */}
                <div 
                  ref={contentRef} 
                  className="flex-1 overflow-auto p-6 bg-white"
                  style={{
                    fontFamily: '"Times New Roman", Times, Georgia, serif',
                    fontSize: '12pt',
                    lineHeight: '1.6',
                    color: '#1a1a1a',
                  }}
                >
                  <div 
                    className="regulatory-content"
                    style={{ textAlign: 'justify' }}
                    dangerouslySetInnerHTML={{ 
                      __html: formatAsAMAContent(streamState.content) 
                    }}
                  />
                  <span className="inline-block w-0.5 h-4 bg-accent-purple ml-0.5 animate-pulse" />
                </div>
                
                {/* Streaming Footer */}
                <div className="px-4 py-3 border-t border-border bg-surface flex items-center justify-between">
                  <div className="flex items-center gap-4 text-xs text-text-muted">
                    <span className="flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5" />
                      {streamMetrics.wordCount} words
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      {streamMetrics.elapsedSeconds.toFixed(1)}s
                    </span>
                  </div>
                  <div className="text-xs text-text-muted">
                    claude-sonnet-4 • temp 0.3
                  </div>
                </div>
              </div>
            )}
            
            {/* Content Display (when generated or streaming complete) */}
            {(hasGenerated || streamComplete) && !isStreaming && (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Toolbar with View Mode Toggle */}
                <div className="px-4 py-2 border-b border-border flex items-center justify-between bg-surface">
                  <div className="flex items-center gap-3">
                    <span className="text-xs px-2 py-1 bg-accent-green/20 text-accent-green rounded flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      AI Generated
                    </span>
                    <span className="text-xs text-text-muted">
                      {(localContent || streamState.content).split(/\s+/).filter(Boolean).length} words
                      {generationTime && ` • Generated in ${(generationTime / 1000).toFixed(1)}s`}
                      {streamComplete && streamMetrics.totalTokens > 0 && (
                        <> • {streamMetrics.totalTokens} tokens • ${streamMetrics.estimatedCost.toFixed(4)}</>
                      )}
                    </span>
                    
                    {/* View Mode Toggle */}
                    <div className="flex items-center bg-surface-card rounded-lg border border-border overflow-hidden ml-2">
                      <button
                        onClick={() => setContentViewMode('preview')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs transition-colors ${
                          contentViewMode === 'preview'
                            ? 'bg-accent-blue text-white'
                            : 'text-text-muted hover:text-text-primary'
                        }`}
                        title="Document Preview (ICH/AMA Template)"
                      >
                        <Eye className="w-3 h-3" />
                        Preview
                      </button>
                      <button
                        onClick={() => setContentViewMode('edit')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs transition-colors ${
                          contentViewMode === 'edit'
                            ? 'bg-accent-blue text-white'
                            : 'text-text-muted hover:text-text-primary'
                        }`}
                        title="Edit Raw Markdown"
                      >
                        <Edit3 className="w-3 h-3" />
                        Edit
                      </button>
                    </div>
                  </div>
                  <button
                    onClick={() => handleGenerate(true)}
                    disabled={isGenerating}
                    className="text-xs text-accent-purple hover:underline flex items-center gap-1"
                  >
                    <RefreshCw className={`w-3 h-3 ${isGenerating ? 'animate-spin' : ''}`} />
                    Regenerate
                  </button>
                </div>
                
                {/* Template Indicator */}
                {contentViewMode === 'preview' && (
                  <div className="px-4 py-2 bg-accent-blue/5 border-b border-accent-blue/20 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-accent-blue" />
                    <span className="text-xs font-medium text-accent-blue">
                      {docConfig?.displayName || 'Regulatory Document'} Template
                    </span>
                    <span className="text-xs text-text-muted">
                      • ICH E3 Structure • AMA 11th Edition Style
                    </span>
                  </div>
                )}
                
                {/* Quality Panel */}
                {(qualityIssues.length > 0 || qualitySuggestions.length > 0) && showQualityPanel && (
                  <div className="px-4 py-3 border-b border-border bg-surface">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-accent-amber" />
                        Quality Check
                      </h4>
                      <button 
                        onClick={() => setShowQualityPanel(false)}
                        className="text-xs text-text-muted hover:text-text-primary"
                      >
                        Dismiss
                      </button>
                    </div>
                    {qualityIssues.length > 0 && (
                      <div className="mb-2">
                        <span className="text-xs text-accent-red font-medium">Issues:</span>
                        <ul className="mt-1 space-y-1">
                          {qualityIssues.map((issue, i) => (
                            <li key={i} className="text-xs text-accent-red flex items-start gap-1">
                              <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                              {issue}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {qualitySuggestions.length > 0 && (
                      <div>
                        <span className="text-xs text-accent-amber font-medium">Suggestions:</span>
                        <ul className="mt-1 space-y-1">
                          {qualitySuggestions.map((suggestion, i) => (
                            <li key={i} className="text-xs text-text-muted flex items-start gap-1">
                              <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                              {suggestion}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Content Area - Toggle between Preview and Edit */}
                <div className="flex-1 overflow-auto">
                  {contentViewMode === 'preview' ? (
                    <CompactDocumentPreview
                      content={localContent || streamState.content}
                      metadata={{
                        title: section.title,
                        documentType,
                        version: '1.0',
                        productName: productName,
                        studyName: studyName,
                      }}
                      maxHeight="none"
                      className="h-full border-0 rounded-none"
                    />
                  ) : (
                    <div className="p-4">
                      <textarea
                        value={localContent || streamState.content}
                        onChange={(e) => setLocalContent(e.target.value)}
                        className="w-full h-full min-h-[400px] bg-surface-card border border-border rounded-lg p-4 text-sm text-text-primary font-mono resize-none focus:outline-none focus:border-accent-blue"
                        placeholder="Edit generated content..."
                      />
                    </div>
                  )}
                </div>
                
                {/* Citations */}
                {localCitations.length > 0 && (
                  <div className="p-4 border-t border-border bg-surface">
                    <h4 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
                      <Link2 className="w-4 h-4" />
                      Source Citations ({localCitations.length})
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {localCitations.map((cite) => (
                        <div
                          key={cite.id}
                          className={`text-xs px-2 py-1 rounded border ${getConfidenceColor(cite.confidence)}`}
                        >
                          {cite.sourceTitle.split(' - ')[0]}
                          {cite.sourceSection && ` → ${cite.sourceSection}`}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Actions */}
                <div className="p-4 border-t border-border bg-surface-elevated">
                  {isAcceptedState ? (
                    // v0.124.9: Clear "what's next?" state after accept
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-accent-green text-sm font-medium">
                        <CheckCircle className="w-5 h-5" />
                        Content applied to Section {section.number}
                      </div>
                      <p className="text-xs text-text-muted">Closing automatically… or choose what to do next:</p>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onClose?.()}
                          className="flex-1 px-4 py-2 bg-accent-blue text-white rounded-lg text-sm font-medium hover:bg-accent-blue/90 flex items-center justify-center gap-2"
                        >
                          ← Back to Document
                        </button>
                        <button
                          onClick={() => { setIsAcceptedState(false); }}
                          className="flex-1 px-4 py-2 bg-purple-500/20 text-purple-400 rounded-lg text-sm font-medium hover:bg-purple-500/30 flex items-center justify-center gap-2"
                        >
                          Generate Next Section
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <button
                        onClick={handleDiscard}
                        className="px-4 py-2 text-accent-red hover:bg-accent-red/10 rounded-lg text-sm"
                      >
                        Discard
                      </button>
                      <button
                        onClick={handleAccept}
                        className="px-6 py-2 bg-accent-green text-white rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-accent-green/90"
                      >
                        <Check className="w-4 h-4" />
                        Accept & Apply
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          
          {/* Right: Source Selection Panel */}
          {showSourcePanel && (
            <div className="hidden xl:flex w-80 border-l border-border bg-surface flex flex-col">
              <div className="p-4 border-b border-border">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold text-text-primary">Source Documents</h4>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={selectAllSources}
                      className="text-xs text-accent-blue hover:underline"
                    >
                      All
                    </button>
                    <span className="text-text-muted">/</span>
                    <button
                      onClick={clearSourceSelection}
                      className="text-xs text-text-muted hover:text-text-primary"
                    >
                      None
                    </button>
                  </div>
                </div>
                <p className="text-xs text-text-muted">
                  {selectedSources.length} of {availableSources.length} selected
                </p>
              </div>
              
              <div className="flex-1 overflow-auto p-4 space-y-2">
                {availableSources.map((source) => {
                  const isSelected = selectedSourceIds.has(source.id);
                  const isRequired = requiredTypes.includes(source.type);
                  
                  return (
                    <button
                      key={source.id}
                      onClick={() => toggleSourceSelection(source.id)}
                      className={`w-full text-left p-3 rounded-lg border transition-all ${
                        isSelected
                          ? 'border-accent-blue bg-accent-blue/10 ring-1 ring-accent-blue/30'
                          : 'border-border bg-surface-card hover:border-accent-blue/50'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <div className={`mt-0.5 w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                          isSelected
                            ? 'border-accent-blue bg-accent-blue'
                            : 'border-border'
                        }`}>
                          {isSelected && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-text-primary truncate">
                              {source.title.split(' - ')[0]}
                            </span>
                            {isRequired && (
                              <span className="text-xs px-1.5 py-0.5 bg-accent-amber/20 text-accent-amber rounded flex-shrink-0">
                                rec
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-text-muted mt-0.5">
                            {source.type.replace(/-/g, ' ')} • v{source.version}
                          </div>
                          {source.sections && source.sections.length > 0 && (
                            <div className="text-xs text-accent-blue mt-1">
                              {source.sections.length} sections
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
              
              {/* Required types info */}
              {sectionConfig && requiredTypes.length > 0 && (
                <div className="p-4 border-t border-border bg-surface-elevated">
                  <div className="text-xs text-text-muted mb-2 flex items-center gap-1">
                    <Target className="w-3 h-3" />
                    Recommended source types:
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {requiredTypes.map((type) => {
                      const hasSource = selectedSources.some(s => s.type === type);
                      return (
                        <span
                          key={type}
                          className={`text-xs px-2 py-0.5 rounded ${
                            hasSource
                              ? 'bg-accent-green/20 text-accent-green'
                              : 'bg-surface-card text-text-muted'
                          }`}
                        >
                          {type.replace(/-/g, ' ').slice(0, 15)}
                          {hasSource && <Check className="w-3 h-3 inline ml-1" />}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

