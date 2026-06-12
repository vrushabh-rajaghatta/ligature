

// ============================================================================
// HAQContextPanel - v174: Cross-Module Context for HAQ Response Drafting
// ============================================================================
// Auto-surfaces linked documents from Safety, CTMS, TMF, eCTD, QMS, and 
// Authoring modules when viewing or drafting an HAQ response. Provides
// contextual intelligence to help draft comprehensive, well-supported answers.
// ============================================================================

import { useState, useMemo, useCallback } from 'react';
import {
  ChevronDown,
  ChevronRight,
  ExternalLink,
  FileText,
  AlertTriangle,
  FlaskConical,
  FolderArchive,
  Send,
  ClipboardList,
  BookOpen,
  Link2,
  Search,
  Sparkles,
  RefreshCw,
  Filter,
  Eye,
  Plus,
  Copy,
  Check,
  ArrowUpRight,
  Info,
  X,
  Lightbulb,
} from 'lucide-react';
import {
  useDocumentLinkStore,
  useAllDocumentLinks,
  type LinkableModule,
  type DocumentLink,
} from '@/store/useDocumentLinkStore';
import { usePharmacovigilanceStore } from '@/store/usePharmacovigilanceStore';
import { useCTMSStore } from '@/store/useCTMSStore';
import { useTMFStore } from '@/store/useTMFStore';
import { useQMSStore } from '@/store/useQMSStore';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { SearchInput } from '@/components/ui/Input';
import type { BadgeColor } from '@/components/ui/Badge';
import type { HAQuestion, HAQDiscipline } from '@/types/haq';

// ============================================================================
// TYPES
// ============================================================================

// v0.42.28: Store item interfaces for suggestions
interface StudyStoreItem {
  id: string;
  productId?: string;
  name?: string;
  studyId?: string;
  phase?: string;
  status?: string;
  protocolNumber?: string;
}

interface DeviationStoreItem {
  id: string;
  title?: string;
  description?: string;
  deviationNumber?: string;
  classification?: string;
  severity?: string;
  status?: string;
  type?: string;
  rootCauseCategory?: string;
}

interface HAQContextPanelProps {
  haq: HAQuestion;
  onNavigateToDocument?: (module: LinkableModule, documentId: string) => void;
  onCiteDocument?: (documentTitle: string, section?: string) => void;
  isCollapsible?: boolean;
  defaultExpanded?: boolean;
}

interface LinkedDocumentWithDetails extends DocumentLink {
  moduleDetails?: {
    status?: string;
    priority?: string;
    subtitle?: string;
    relevanceScore?: number;
    matchedKeywords?: string[];
  };
}

interface ModuleSection {
  module: LinkableModule;
  label: string;
  icon: React.ReactNode;
  color: BadgeColor;
  documents: LinkedDocumentWithDetails[];
  suggestedDocuments?: SuggestedDocument[];
  isExpanded: boolean;
}

interface SuggestedDocument {
  id: string;
  module: LinkableModule;
  title: string;
  subtitle?: string;
  relevanceScore: number;
  matchReason: string;
  matchedKeywords: string[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

const MODULE_CONFIG: Record<LinkableModule, { label: string; icon: React.ReactNode; color: BadgeColor }> = {
  safety: { label: 'Safety Signals', icon: <AlertTriangle className="w-4 h-4" />, color: 'red' },
  ctms: { label: 'Clinical Data', icon: <FlaskConical className="w-4 h-4" />, color: 'emerald' },
  tmf: { label: 'TMF Artifacts', icon: <FolderArchive className="w-4 h-4" />, color: 'purple' },
  ectd: { label: 'eCTD Documents', icon: <Send className="w-4 h-4" />, color: 'blue' },
  qms: { label: 'QMS Records', icon: <ClipboardList className="w-4 h-4" />, color: 'teal' },
  authoring: { label: 'Source Documents', icon: <BookOpen className="w-4 h-4" />, color: 'slate' },
  haq: { label: 'Related HAQs', icon: <FileText className="w-4 h-4" />, color: 'amber' },
  publishing: { label: 'Published Docs', icon: <Send className="w-4 h-4" />, color: 'orange' },
};

const DISCIPLINE_MODULES: Record<HAQDiscipline, LinkableModule[]> = {
  CMC: ['authoring', 'tmf', 'ectd', 'qms'],
  Clinical: ['ctms', 'safety', 'authoring', 'tmf', 'ectd'],
  Nonclinical: ['authoring', 'tmf', 'ectd'],
  Biometrics: ['ctms', 'authoring', 'ectd'],
  Pharmacology: ['authoring', 'tmf', 'safety'],
  Labeling: ['authoring', 'ectd', 'qms'],
  Administrative: ['tmf', 'ectd', 'authoring'],
  Safety: ['safety', 'ctms', 'authoring', 'ectd'],
};

// ============================================================================
// COMPONENT
// ============================================================================

export function HAQContextPanel({
  haq,
  onNavigateToDocument,
  onCiteDocument,
  isCollapsible = true,
  defaultExpanded = true,
}: HAQContextPanelProps) {
  // Store access
  const linkedDocs = useAllDocumentLinks('haq', haq.id);
  const getLinksFromSource = useDocumentLinkStore(s => s.getLinksFromSource);
  const getLinksToTarget = useDocumentLinkStore(s => s.getLinksToTarget);
  
  // Safety data for enrichment
  const signals = usePharmacovigilanceStore(s => s.signals);
  const cases = usePharmacovigilanceStore(s => s.cases);
  
  // CTMS data
  const studies = useCTMSStore(s => s.studies);
  const protocolDeviations = useCTMSStore(s => s.protocolDeviations);
  
  // TMF data
  const tmfArtifacts = useTMFStore(s => s.artifacts);
  
  // QMS data
  const qmsDeviations = useQMSStore(s => s.deviations);
  const qmsCAPAs = useQMSStore(s => s.capas);
  
  // Local state
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [expandedModules, setExpandedModules] = useState<Set<LinkableModule>>(new Set(['safety', 'ctms'] as LinkableModule[]));
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  // Toggle module expansion
  const toggleModule = useCallback((module: LinkableModule) => {
    setExpandedModules(prev => {
      const next = new Set(prev);
      if (next.has(module)) {
        next.delete(module);
      } else {
        next.add(module);
      }
      return next;
    });
  }, []);
  
  // Enrich documents with module-specific details
  const enrichDocument = useCallback((link: DocumentLink): LinkedDocumentWithDetails => {
    const enriched: LinkedDocumentWithDetails = { ...link };
    
    switch (link.targetModule) {
      case 'safety':
        const signal = signals[link.targetId];
        if (signal) {
          enriched.moduleDetails = {
            status: signal.status,
            priority: signal.priority,
            subtitle: `${signal.caseCount || 0} cases • PRR ${(signal.statistics?.prr as any)?.prr || signal.statistics?.prr || 'N/A'}`,
          };
        }
        break;
      case 'ctms':
        const studiesArray = Object.values(studies);
        const study = studiesArray.find(s => s.id === link.targetId);
        if (study) {
          enriched.moduleDetails = {
            status: study.status,
            subtitle: `${(study as any).sites?.length || 0} sites • ${(study as any).enrolled || 0}/${(study as any).targetEnrollment || 0} enrolled`,
          };
        }
        break;
      case 'tmf':
        const artifact = tmfArtifacts[link.targetId];
        if (artifact) {
          enriched.moduleDetails = {
            status: artifact.status,
            subtitle: `Zone ${(artifact as any).zone || 'N/A'} • v${(artifact as any).version || '1.0'}`,
          };
        }
        break;
      case 'qms':
        const deviationsArray = Object.values(qmsDeviations);
        const deviation = deviationsArray.find(d => d.id === link.targetId);
        if (deviation) {
          enriched.moduleDetails = {
            status: deviation.status,
            priority: (deviation as any).classification || (deviation as any).severity,
            subtitle: `${(deviation as any).type || 'Deviation'} • ${(deviation as any).rootCauseCategory || 'Pending analysis'}`,
          };
        }
        break;
    }
    
    return enriched;
  }, [signals, studies, tmfArtifacts, qmsDeviations]);
  
  // Generate suggested documents based on HAQ content
  const suggestedDocuments = useMemo((): SuggestedDocument[] => {
    const suggestions: SuggestedDocument[] = [];
    const keywords = haq.tags || [];
    const questionLower = haq.questionText.toLowerCase();
    
    // Extract key terms from question
    const keyTerms = [
      ...keywords,
      ...(haq.aiAnalysis?.keyTopics || []),
    ].map(t => t.toLowerCase());
    
    // Check for safety-related keywords
    const safetyKeywords = ['adverse', 'safety', 'signal', 'event', 'reaction', 'toxicity', 'hepato', 'cardio'];
    const hasSafetyRelevance = safetyKeywords.some(k => questionLower.includes(k) || keyTerms.some(t => t.includes(k)));
    
    if (hasSafetyRelevance && haq.discipline === 'Clinical' || haq.discipline === 'Safety') {
      // Suggest relevant safety signals
      Object.values(signals).forEach(signal => {
        const signalTerm = (signal as any).eventTerm || (signal as any).name || '';
        const matchedKeywords = safetyKeywords.filter(k => 
          signalTerm?.toLowerCase().includes(k) || 
          questionLower.includes(signalTerm?.toLowerCase() || '')
        );
        if (matchedKeywords.length > 0 || (signal.status as string) === 'under-review') {
          suggestions.push({
            id: signal.id,
            module: 'safety',
            title: signalTerm || `Signal ${signal.signalNumber}`,
            subtitle: `${signal.caseCount || 0} cases • Status: ${signal.status}`,
            relevanceScore: Math.min(100, 60 + matchedKeywords.length * 15),
            matchReason: 'Safety signal matches question topic',
            matchedKeywords,
          });
        }
      });
    }
    
    // Check for clinical trial data keywords
    const clinicalKeywords = ['study', 'trial', 'patient', 'efficacy', 'dose', 'enrollment', 'protocol'];
    const hasClinicalRelevance = clinicalKeywords.some(k => questionLower.includes(k));
    
    if (hasClinicalRelevance && (haq.discipline === 'Clinical' || haq.discipline === 'Biometrics')) {
      (Object.values(studies) as StudyStoreItem[]).forEach((study: StudyStoreItem) => {
        if (study.productId === haq.productId) {
          const studyName = study.name || study.studyId || '';
          const studyPhase = study.phase || '';
          const matchedKeywords = clinicalKeywords.filter(k => 
            studyName?.toLowerCase().includes(k) || studyPhase?.toLowerCase().includes(k)
          );
          suggestions.push({
            id: study.id,
            module: 'ctms',
            title: studyName || study.protocolNumber || 'Study',
            subtitle: `${studyPhase} • ${study.status}`,
            relevanceScore: 85, // High relevance for same product
            matchReason: 'Clinical study for same product',
            matchedKeywords,
          });
        }
      });
    }
    
    // Check for QMS keywords
    const qmsKeywords = ['deviation', 'capa', 'quality', 'compliance', 'audit', 'nonconformance'];
    const hasQMSRelevance = qmsKeywords.some(k => questionLower.includes(k));
    
    if (hasQMSRelevance || haq.discipline === 'CMC') {
      (Object.values(qmsDeviations) as DeviationStoreItem[]).forEach((dev: DeviationStoreItem) => {
        const matchedKeywords = qmsKeywords.filter(k => 
          dev.title?.toLowerCase().includes(k) || dev.description?.toLowerCase().includes(k)
        );
        if (matchedKeywords.length > 0) {
          suggestions.push({
            id: dev.id,
            module: 'qms',
            title: dev.title || `Deviation ${dev.deviationNumber || dev.id}`,
            subtitle: `${dev.classification || dev.severity || 'N/A'} • ${dev.status}`,
            relevanceScore: 65 + matchedKeywords.length * 10,
            matchReason: 'QMS record matches question context',
            matchedKeywords,
          });
        }
      });
    }
    
    // Sort by relevance and deduplicate
    return suggestions
      .filter(s => !linkedDocs.some(l => l.targetId === s.id))
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 5);
  }, [haq, signals, studies, qmsDeviations, linkedDocs]);
  
  // Organize linked documents by module
  const moduleSections = useMemo((): ModuleSection[] => {
    const relevantModules = DISCIPLINE_MODULES[haq.discipline] || ['authoring', 'tmf', 'ectd'];
    
    return relevantModules.map(module => {
      const config = MODULE_CONFIG[module];
      const moduleDocs = linkedDocs
        .filter(link => link.targetModule === module || link.sourceModule === module)
        .map(enrichDocument)
        .filter(doc => {
          if (!searchQuery) return true;
          const query = searchQuery.toLowerCase();
          return (
            doc.targetTitle?.toLowerCase().includes(query) ||
            doc.sourceTitle?.toLowerCase().includes(query) ||
            doc.context?.description?.toLowerCase().includes(query)
          );
        });
      
      const moduleSuggestions = suggestedDocuments.filter(s => s.module === module);
      
      return {
        module,
        label: config.label,
        icon: config.icon,
        color: config.color,
        documents: moduleDocs,
        suggestedDocuments: showSuggestions ? moduleSuggestions : [],
        isExpanded: expandedModules.has(module),
      };
    });
  }, [haq.discipline, linkedDocs, enrichDocument, searchQuery, expandedModules, suggestedDocuments, showSuggestions]);
  
  // Handle copy citation
  const handleCopyCitation = useCallback((doc: LinkedDocumentWithDetails) => {
    const citation = `[${doc.targetTitle}${doc.targetVersion ? ` v${doc.targetVersion}` : ''}]`;
    navigator.clipboard.writeText(citation);
    setCopiedId(doc.id);
    setTimeout(() => setCopiedId(null), 2000);
    onCiteDocument?.(doc.targetTitle, doc.context?.targetSection);
  }, [onCiteDocument]);
  
  // Count total linked and suggested
  const totalLinked = linkedDocs.length;
  const totalSuggested = suggestedDocuments.length;
  
  if (!isExpanded && isCollapsible) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="w-full flex items-center justify-between p-3 bg-surface-card border border-border rounded-lg hover:bg-surface transition-colors"
      >
        <div className="flex items-center gap-2">
          <Link2 className="w-4 h-4 text-accent-blue" />
          <span className="text-sm font-medium text-text-primary">Context Panel</span>
          {totalLinked > 0 && (
            <Badge color="blue" size="sm">{totalLinked} linked</Badge>
          )}
          {totalSuggested > 0 && (
            <Badge color="amber" size="sm">{totalSuggested} suggested</Badge>
          )}
        </div>
        <ChevronRight className="w-4 h-4 text-text-muted" />
      </button>
    );
  }
  
  return (
    <div className="bg-surface-card border border-border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface">
        <div className="flex items-center gap-2">
          <Link2 className="w-5 h-5 text-accent-blue" />
          <h3 className="font-semibold text-text-primary">HAQ Context</h3>
          {totalLinked > 0 && (
            <Badge color="blue" size="sm">{totalLinked} linked</Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSuggestions(!showSuggestions)}
            className={`p-1.5 rounded-lg transition-colors ${
              showSuggestions 
                ? 'bg-accent-amber/20 text-accent-amber' 
                : 'text-text-muted hover:bg-surface-card'
            }`}
            title={showSuggestions ? 'Hide suggestions' : 'Show suggestions'}
          >
            <Sparkles className="w-4 h-4" />
          </button>
          {isCollapsible && (
            <button
              onClick={() => setIsExpanded(false)}
              className="p-1.5 hover:bg-surface-card rounded-lg text-text-muted"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
      
      {/* Search */}
      <div className="px-4 py-2 border-b border-border">
        <SearchInput
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search linked documents..."
        />
      </div>
      
      {/* AI Suggestions Banner */}
      {showSuggestions && totalSuggested > 0 && (
        <div className="px-4 py-2 bg-accent-amber/10 border-b border-accent-amber/20">
          <div className="flex items-center gap-2 text-sm">
            <Lightbulb className="w-4 h-4 text-accent-amber" />
            <span className="text-text-secondary">
              <strong className="text-accent-amber">{totalSuggested}</strong> suggested documents match this HAQ
            </span>
          </div>
        </div>
      )}
      
      {/* Module Sections */}
      <div className="max-h-[400px] overflow-y-auto">
        {moduleSections.map(section => {
          const hasContent = section.documents.length > 0 || (section.suggestedDocuments?.length || 0) > 0;
          
          return (
            <div key={section.module} className="border-b border-border last:border-b-0">
              {/* Section Header */}
              <button
                onClick={() => toggleModule(section.module)}
                className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-surface transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className={`text-${section.color === 'slate' ? 'text-muted' : `accent-${section?.color ?? ''}`}`}>
                    {section.icon}
                  </span>
                  <span className="text-sm font-medium text-text-primary">{section.label}</span>
                  {section.documents.length > 0 && (
                    <Badge color={section.color} size="xs">{section.documents.length}</Badge>
                  )}
                  {(section.suggestedDocuments?.length || 0) > 0 && (
                    <Badge color="amber" variant="soft" size="xs">
                      +{section.suggestedDocuments?.length}
                    </Badge>
                  )}
                </div>
                {hasContent && (
                  section.isExpanded 
                    ? <ChevronDown className="w-4 h-4 text-text-muted" />
                    : <ChevronRight className="w-4 h-4 text-text-muted" />
                )}
              </button>
              
              {/* Section Content */}
              {section.isExpanded && hasContent && (
                <div className="px-4 pb-3 space-y-2">
                  {/* Linked Documents */}
                  {section.documents.map(doc => (
                    <div
                      key={doc.id}
                      className="flex items-start gap-2 p-2 bg-surface rounded-lg group"
                    >
                      <div className="p-1.5 bg-surface-card rounded">
                        <FileText className="w-3.5 h-3.5 text-text-muted" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-text-primary truncate">
                            {doc.targetTitle || doc.sourceTitle}
                          </span>
                          {doc.targetVersion && (
                            <Badge color="slate" size="xs">v{doc.targetVersion}</Badge>
                          )}
                        </div>
                        {doc.moduleDetails?.subtitle && (
                          <p className="text-xs text-text-muted truncate">
                            {doc.moduleDetails.subtitle}
                          </p>
                        )}
                        {doc.context?.description && (
                          <p className="text-xs text-text-secondary mt-0.5 line-clamp-1">
                            {doc.context.description}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleCopyCitation(doc)}
                          className="p-1 hover:bg-surface-card rounded text-text-muted"
                          title="Copy citation"
                        >
                          {copiedId === doc.id ? (
                            <Check className="w-3.5 h-3.5 text-accent-green" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          onClick={() => onNavigateToDocument?.(doc.targetModule, doc.targetId)}
                          className="p-1 hover:bg-surface-card rounded text-text-muted"
                          title="View document"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                  
                  {/* Suggested Documents */}
                  {section.suggestedDocuments?.map(suggestion => (
                    <div
                      key={suggestion.id}
                      className="flex items-start gap-2 p-2 bg-accent-amber/5 border border-accent-amber/20 rounded-lg group"
                    >
                      <div className="p-1.5 bg-accent-amber/20 rounded">
                        <Sparkles className="w-3.5 h-3.5 text-accent-amber" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-text-primary truncate">
                            {suggestion.title}
                          </span>
                          <Badge color="amber" variant="soft" size="xs">
                            {suggestion.relevanceScore}% match
                          </Badge>
                        </div>
                        {suggestion.subtitle && (
                          <p className="text-xs text-text-muted truncate">
                            {suggestion.subtitle}
                          </p>
                        )}
                        <p className="text-xs text-accent-amber mt-0.5">
                          {suggestion.matchReason}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => onNavigateToDocument?.(suggestion.module, suggestion.id)}
                          className="p-1 hover:bg-accent-amber/20 rounded text-accent-amber"
                          title="View & link"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                  
                  {/* Empty state for module */}
                  {section.documents.length === 0 && (!section.suggestedDocuments || section.suggestedDocuments.length === 0) && (
                    <div className="text-center py-3">
                      <p className="text-xs text-text-muted">No linked documents</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      {/* Footer - Quick Actions */}
      <div className="px-4 py-3 border-t border-border bg-surface">
        <div className="flex items-center justify-between">
          <span className="text-xs text-text-muted">
            Showing context for {haq.discipline} question
          </span>
          <Button
            variant="ghost"
            size="sm"
            icon={<Plus className="w-3.5 h-3.5" />}
            onClick={() => {/* Open CreateLinkModal */}}
          >
            Add Link
          </Button>
        </div>
      </div>
    </div>
  );
}

export default HAQContextPanel;
