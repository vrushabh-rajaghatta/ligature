

// ============================================================================
// HAQEvidenceGatherer - v174: Evidence Collection Workflow for HAQ Responses
// ============================================================================
// One-click workflow to pull relevant TMF artifacts, clinical data, safety 
// signals, and QMS records into an HAQ response draft. Intelligently selects
// evidence based on question content and existing links.
// ============================================================================

import { useState, useMemo, useCallback } from 'react';
import {
  Search,
  FileText,
  AlertTriangle,
  FlaskConical,
  FolderArchive,
  ClipboardList,
  BookOpen,
  Check,
  Plus,
  ChevronRight,
  Sparkles,
  Download,
  Copy,
  RefreshCw,
  Filter,
  X,
  Loader2,
  ArrowRight,
  Zap,
  Package,
  ListChecks,
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
import { SearchInput } from '@/components/ui/Input';
import { ProgressBar } from '@/components/ui/Progress';
import type { BadgeColor } from '@/components/ui/Badge';
import type { HAQuestion, HAQDiscipline } from '@/types/haq';

// ============================================================================
// TYPES
// ============================================================================

interface HAQEvidenceGathererProps {
  haq: HAQuestion;
  isOpen: boolean;
  onClose: () => void;
  onEvidenceGathered?: (evidence: GatheredEvidence) => void;
}

interface EvidenceSource {
  id: string;
  module: LinkableModule;
  type: string;
  title: string;
  subtitle?: string;
  relevance: 'high' | 'medium' | 'low';
  relevanceScore: number;
  matchedKeywords: string[];
  isSelected: boolean;
  isLinked: boolean;
  excerpt?: string;
  metadata?: Record<string, unknown>;
}

interface GatheredEvidence {
  sources: EvidenceSource[];
  summary: string;
  citations: string[];
  suggestedText: string;
}

interface GatherStep {
  id: string;
  label: string;
  status: 'pending' | 'active' | 'complete' | 'skipped';
  itemsFound: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const MODULE_CONFIG: Record<LinkableModule, { label: string; icon: React.ReactNode; color: BadgeColor }> = {
  safety: { label: 'Safety', icon: <AlertTriangle className="w-4 h-4" />, color: 'red' },
  ctms: { label: 'Clinical', icon: <FlaskConical className="w-4 h-4" />, color: 'emerald' },
  tmf: { label: 'TMF', icon: <FolderArchive className="w-4 h-4" />, color: 'purple' },
  qms: { label: 'QMS', icon: <ClipboardList className="w-4 h-4" />, color: 'teal' },
  authoring: { label: 'Documents', icon: <BookOpen className="w-4 h-4" />, color: 'slate' },
  ectd: { label: 'eCTD', icon: <FileText className="w-4 h-4" />, color: 'blue' },
  haq: { label: 'HAQ', icon: <FileText className="w-4 h-4" />, color: 'amber' },
  publishing: { label: 'Publishing', icon: <FileText className="w-4 h-4" />, color: 'orange' },
};

// ============================================================================
// COMPONENT
// ============================================================================

export function HAQEvidenceGatherer({
  haq,
  isOpen,
  onClose,
  onEvidenceGathered,
}: HAQEvidenceGathererProps) {
  // Store access
  const linkedDocs = useAllDocumentLinks('haq', haq.id);
  const createLink = useDocumentLinkStore(s => s.createLink);
  
  // Safety data
  const signals = usePharmacovigilanceStore(s => s.signals);
  const cases = usePharmacovigilanceStore(s => s.cases);
  
  // CTMS data
  const studies = useCTMSStore(s => s.studies);
  const protocolDeviations = useCTMSStore(s => s.protocolDeviations);
  
  // TMF data
  const tmfArtifacts = useTMFStore(s => s.artifacts);
  
  // QMS data - use useMemo to avoid new array on every render
  const qmsDeviationsMap = useQMSStore(s => s.deviations);
  const qmsDeviations = useMemo(() => Object.values(qmsDeviationsMap || {}), [qmsDeviationsMap]);
  const qmsCAPAs = useQMSStore(s => s.capas);
  
  // Local state
  const [step, setStep] = useState<'scan' | 'select' | 'gather' | 'complete'>('scan');
  const [isScanning, setIsScanning] = useState(false);
  const [selectedSources, setSelectedSources] = useState<Set<string>>(new Set());
  const [gatherProgress, setGatherProgress] = useState(0);
  const [gatheredEvidence, setGatheredEvidence] = useState<GatheredEvidence | null>(null);
  
  // Gather steps for progress tracking
  const [gatherSteps, setGatherSteps] = useState<GatherStep[]>([
    { id: 'safety', label: 'Scanning Safety Signals', status: 'pending', itemsFound: 0 },
    { id: 'clinical', label: 'Searching Clinical Data', status: 'pending', itemsFound: 0 },
    { id: 'tmf', label: 'Checking TMF Artifacts', status: 'pending', itemsFound: 0 },
    { id: 'qms', label: 'Reviewing QMS Records', status: 'pending', itemsFound: 0 },
    { id: 'generate', label: 'Generating Summary', status: 'pending', itemsFound: 0 },
  ]);
  
  // Find relevant evidence sources
  const evidenceSources = useMemo((): EvidenceSource[] => {
    const sources: EvidenceSource[] = [];
    const keywords = [
      ...(haq.tags || []),
      ...(haq.aiAnalysis?.keyTopics || []),
    ].map(k => k.toLowerCase());
    const questionLower = haq.questionText.toLowerCase();
    
    // Safety signals
    Object.values(signals).forEach(signal => {
      const eventLower = (signal.primaryEvent || signal.title || '').toLowerCase();
      const matchedKeywords = keywords.filter(k => eventLower.includes(k) || questionLower.includes(eventLower));
      
      // Score based on multiple factors
      let relevanceScore = 30; // Base score
      if (matchedKeywords.length > 0) relevanceScore += matchedKeywords.length * 15;
      if (signal.status === 'under-evaluation' || signal.status === 'validated') relevanceScore += 20;
      if (signal.productId === haq.productId) relevanceScore += 25;
      if (haq.discipline === 'Safety' || haq.discipline === 'Clinical') relevanceScore += 15;
      
      if (relevanceScore >= 45 || signal.productId === haq.productId) {
        sources.push({
          id: signal.id,
          module: 'safety',
          type: 'signal',
          title: signal.primaryEvent || signal.title || `Signal ${signal.signalNumber}`,
          subtitle: `${signal.caseCount || 0} cases • PRR ${signal.statistics?.prr || 'N/A'}`,
          relevance: relevanceScore >= 75 ? 'high' : relevanceScore >= 50 ? 'medium' : 'low',
          relevanceScore: Math.min(100, relevanceScore),
          matchedKeywords,
          isSelected: false,
          isLinked: linkedDocs.some(l => l.targetId === signal.id),
          excerpt: signal.description || 'Safety signal under evaluation',
        });
      }
    });
    
    // Clinical studies
    Object.values(studies).forEach(study => {
      let relevanceScore = 30;
      const studyText = `${study.title || ''} ${study.indication || ''} ${study.phase || ''}`.toLowerCase();
      const matchedKeywords = keywords.filter(k => studyText.includes(k));
      
      if (matchedKeywords.length > 0) relevanceScore += matchedKeywords.length * 15;
      if (study.productId === haq.productId) relevanceScore += 35;
      if (haq.discipline === 'Clinical' || haq.discipline === 'Biometrics') relevanceScore += 15;
      if (questionLower.includes('study') || questionLower.includes('trial')) relevanceScore += 10;
      
      if (relevanceScore >= 50 || study.productId === haq.productId) {
        sources.push({
          id: study.id,
          module: 'ctms',
          type: 'study',
          title: study.title || study.protocolNumber || 'Study',
          subtitle: `${study.phase} • ${study.enrolledSubjects || 0}/${study.targetEnrollment || 0} enrolled`,
          relevance: relevanceScore >= 75 ? 'high' : relevanceScore >= 50 ? 'medium' : 'low',
          relevanceScore: Math.min(100, relevanceScore),
          matchedKeywords,
          isSelected: false,
          isLinked: linkedDocs.some(l => l.targetId === study.id),
          excerpt: study.indication || 'Clinical trial data',
          metadata: { phase: study.phase, status: study.status },
        });
      }
    });
    
    // TMF artifacts
    Object.values(tmfArtifacts).forEach(artifact => {
      let relevanceScore = 25;
      const artifactText = `${artifact.title || ''} ${artifact.description || ''}`.toLowerCase();
      const matchedKeywords = keywords.filter(k => artifactText.includes(k));
      
      if (matchedKeywords.length > 0) relevanceScore += matchedKeywords.length * 12;
      if (artifact.status === 'approved' || artifact.status === 'filed') relevanceScore += 15;
      if (haq.ctdSection && (artifact as any).zone === haq.ctdSection.split('.')[0]) relevanceScore += 20;
      
      if (relevanceScore >= 45) {
        sources.push({
          id: artifact.id,
          module: 'tmf',
          type: 'artifact',
          title: artifact.title || artifact.id,
          subtitle: `Zone ${(artifact as any).zone || 'N/A'} • v${artifact.version || '1.0'}`,
          relevance: relevanceScore >= 70 ? 'high' : relevanceScore >= 45 ? 'medium' : 'low',
          relevanceScore: Math.min(100, relevanceScore),
          matchedKeywords,
          isSelected: false,
          isLinked: linkedDocs.some(l => l.targetId === artifact.id),
          excerpt: artifact.description || 'TMF artifact',
        });
      }
    });
    
    // QMS records
    (qmsDeviations as any[]).forEach(deviation => {
      let relevanceScore = 20;
      const devText = `${deviation.title || ''} ${deviation.description || ''}`.toLowerCase();
      const matchedKeywords = keywords.filter(k => devText.includes(k));
      
      if (matchedKeywords.length > 0) relevanceScore += matchedKeywords.length * 12;
      if ((deviation as any).classification === 'Critical' || (deviation as any).classification === 'Major') relevanceScore += 15;
      if (haq.discipline === 'CMC') relevanceScore += 20;
      if (questionLower.includes('deviation') || questionLower.includes('quality')) relevanceScore += 15;
      
      if (relevanceScore >= 40) {
        sources.push({
          id: deviation.id,
          module: 'qms',
          type: 'deviation',
          title: deviation.title || `DEV-${deviation.deviationNumber}`,
          subtitle: `${deviation.classification} • ${deviation.status}`,
          relevance: relevanceScore >= 65 ? 'high' : relevanceScore >= 40 ? 'medium' : 'low',
          relevanceScore: Math.min(100, relevanceScore),
          matchedKeywords,
          isSelected: false,
          isLinked: linkedDocs.some(l => l.targetId === deviation.id),
          excerpt: deviation.description || 'Quality deviation',
        });
      }
    });
    
    // Sort by relevance score
    return sources.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }, [haq, signals, studies, tmfArtifacts, qmsDeviations, linkedDocs]);
  
  // Start scanning
  const handleStartScan = useCallback(async () => {
    setIsScanning(true);
    
    // Simulate scanning progress
    for (let i = 0; i < gatherSteps.length - 1; i++) {
      await new Promise(resolve => setTimeout(resolve, 400));
      setGatherSteps(prev => prev.map((s, idx) => {
        if (idx === i) return { ...s, status: 'complete', itemsFound: evidenceSources.filter(e => {
          if (idx === 0) return e.module === 'safety';
          if (idx === 1) return e.module === 'ctms';
          if (idx === 2) return e.module === 'tmf';
          if (idx === 3) return e.module === 'qms';
          return false;
        }).length };
        if (idx === i + 1) return { ...s, status: 'active' };
        return s;
      }));
    }
    
    await new Promise(resolve => setTimeout(resolve, 300));
    setGatherSteps(prev => prev.map(s => ({ ...s, status: 'complete' })));
    
    // Auto-select high relevance sources
    const autoSelected = new Set(
      evidenceSources
        .filter(s => s.relevance === 'high' || s.isLinked)
        .map(s => s.id)
    );
    setSelectedSources(autoSelected);
    
    setIsScanning(false);
    setStep('select');
  }, [evidenceSources, gatherSteps.length]);
  
  // Toggle source selection
  const toggleSource = useCallback((sourceId: string) => {
    setSelectedSources(prev => {
      const next = new Set(prev);
      if (next.has(sourceId)) {
        next.delete(sourceId);
      } else {
        next.add(sourceId);
      }
      return next;
    });
  }, []);
  
  // Gather evidence
  const handleGatherEvidence = useCallback(async () => {
    setStep('gather');
    setGatherProgress(0);
    
    const selected = evidenceSources.filter(s => selectedSources.has(s.id));
    
    // Simulate gathering with progress
    for (let i = 0; i <= 100; i += 10) {
      await new Promise(resolve => setTimeout(resolve, 150));
      setGatherProgress(i);
    }
    
    // Generate evidence summary
    const citations = selected.map(s => `[${s.title}${s.subtitle ? ` - ${s.subtitle}` : ''}]`);
    
    const summary = `Evidence gathered from ${selected.length} source${selected.length !== 1 ? 's' : ''} across ${
      new Set(selected.map(s => s.module)).size
    } module${new Set(selected.map(s => s.module)).size !== 1 ? 's' : ''}.`;
    
    const suggestedText = selected.map(s => {
      const moduleLabel = MODULE_CONFIG[s.module]?.label || s.module;
      return `• ${s.title}: ${s.excerpt || 'See referenced document'}`;
    }).join('\n');
    
    const evidence: GatheredEvidence = {
      sources: selected,
      summary,
      citations,
      suggestedText,
    };
    
    setGatheredEvidence(evidence);
    setStep('complete');
    
    // Create links for unlinked sources
    selected.filter(s => !s.isLinked).forEach(source => {
      createLink({
        sourceModule: 'haq',
        sourceId: haq.id,
        sourceType: 'haq-response',
        sourceTitle: `HAQ ${haq.questionNumber}`,
        targetModule: source.module,
        targetId: source.id,
        targetType: source.type,
        targetTitle: source.title,
        linkType: 'haq-to-source',
        direction: 'forward',
        status: 'active',
        strength: source.relevance === 'high' ? 'strong' : 'weak',
        createdBy: 'evidence-gatherer',
        autoGenerated: true,
        context: {
          description: `Auto-linked during evidence gathering for ${haq.questionNumber}`,
          tags: source.matchedKeywords,
        },
      });
    });
  }, [evidenceSources, selectedSources, haq, createLink]);
  
  // Complete and close
  const handleComplete = useCallback(() => {
    if (gatheredEvidence) {
      onEvidenceGathered?.(gatheredEvidence);
    }
    onClose();
  }, [gatheredEvidence, onEvidenceGathered, onClose]);
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-surface-elevated border border-border rounded-xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-accent-purple/20 rounded-lg">
              <Package className="w-5 h-5 text-accent-purple" />
            </div>
            <div>
              <h2 className="font-semibold text-text-primary">Gather Evidence</h2>
              <p className="text-sm text-text-muted">
                {haq.questionNumber}: {haq.discipline} Question
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-surface-card rounded-lg text-text-muted"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {/* Step: Scan */}
          {step === 'scan' && (
            <div className="p-6">
              <div className="text-center mb-8">
                <div className="w-20 h-20 bg-accent-purple/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="w-10 h-10 text-accent-purple" />
                </div>
                <h3 className="text-lg font-semibold text-text-primary mb-2">
                  Scan for Relevant Evidence
                </h3>
                <p className="text-text-secondary max-w-md mx-auto">
                  We'll search Safety, Clinical, TMF, and QMS modules for documents
                  relevant to your HAQ response.
                </p>
              </div>
              
              {/* Scan Steps */}
              <div className="space-y-3 mb-8">
                {gatherSteps.slice(0, -1).map((gs, idx) => (
                  <div
                    key={gs.id}
                    className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                      gs.status === 'active' ? 'bg-accent-purple/10 border border-accent-purple/30' :
                      gs.status === 'complete' ? 'bg-accent-green/10' :
                      'bg-surface-card'
                    }`}
                  >
                    <div className={`p-1.5 rounded-lg ${
                      gs.status === 'active' ? 'bg-accent-purple/20' :
                      gs.status === 'complete' ? 'bg-accent-green/20' :
                      'bg-surface'
                    }`}>
                      {gs.status === 'active' ? (
                        <Loader2 className="w-4 h-4 text-accent-purple animate-spin" />
                      ) : gs.status === 'complete' ? (
                        <Check className="w-4 h-4 text-accent-green" />
                      ) : (
                        <span className="w-4 h-4 block text-center text-xs text-text-muted">{idx + 1}</span>
                      )}
                    </div>
                    <span className={`flex-1 text-sm ${
                      gs.status === 'active' ? 'text-accent-purple font-medium' :
                      gs.status === 'complete' ? 'text-text-primary' :
                      'text-text-muted'
                    }`}>
                      {gs.label}
                    </span>
                    {gs.status === 'complete' && gs.itemsFound > 0 && (
                      <Badge color="green" size="sm">{gs.itemsFound} found</Badge>
                    )}
                  </div>
                ))}
              </div>
              
              <div className="flex justify-center">
                <Button
                  variant="primary"
                  size="lg"
                  icon={isScanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                  onClick={handleStartScan}
                  disabled={isScanning}
                >
                  {isScanning ? 'Scanning...' : 'Start Scan'}
                </Button>
              </div>
            </div>
          )}
          
          {/* Step: Select */}
          {step === 'select' && (
            <div className="flex flex-col h-full">
              <div className="px-6 py-4 border-b border-border bg-surface">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-text-primary">Select Evidence Sources</h3>
                    <p className="text-sm text-text-muted">
                      {evidenceSources.length} sources found • {selectedSources.size} selected
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedSources(new Set(evidenceSources.map(s => s.id)))}
                    >
                      Select All
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedSources(new Set())}
                    >
                      Clear
                    </Button>
                  </div>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-2">
                  {evidenceSources.map(source => {
                    const config = MODULE_CONFIG[source.module];
                    const isSelected = selectedSources.has(source.id);
                    
                    return (
                      <button
                        key={source.id}
                        onClick={() => toggleSource(source.id)}
                        className={`w-full flex items-start gap-3 p-3 rounded-lg text-left transition-colors ${
                          isSelected
                            ? 'bg-accent-blue/10 border border-accent-blue/30'
                            : 'bg-surface-card hover:bg-surface border border-transparent'
                        }`}
                      >
                        <div className={`p-2 rounded-lg ${isSelected ? 'bg-accent-blue/20' : 'bg-surface'}`}>
                          {config.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-text-primary truncate">
                              {source.title}
                            </span>
                            <Badge color={config.color} size="xs">{config.label}</Badge>
                            <Badge
                              color={source.relevance === 'high' ? 'green' : source.relevance === 'medium' ? 'amber' : 'slate'}
                              variant="soft"
                              size="xs"
                            >
                              {source.relevanceScore}%
                            </Badge>
                            {source.isLinked && (
                              <Badge color="blue" variant="soft" size="xs">Linked</Badge>
                            )}
                          </div>
                          {source.subtitle && (
                            <p className="text-sm text-text-muted truncate">{source.subtitle}</p>
                          )}
                          {source.excerpt && (
                            <p className="text-xs text-text-secondary mt-1 line-clamp-2">
                              {source.excerpt}
                            </p>
                          )}
                          {source.matchedKeywords.length > 0 && (
                            <div className="flex gap-1 mt-1.5 flex-wrap">
                              {source.matchedKeywords.slice(0, 3).map(kw => (
                                <span
                                  key={kw}
                                  className="text-xs px-1.5 py-0.5 bg-accent-amber/20 text-accent-amber rounded"
                                >
                                  {kw}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                          isSelected
                            ? 'bg-accent-blue border-accent-blue'
                            : 'border-border'
                        }`}>
                          {isSelected && <Check className="w-3 h-3 text-white" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
              
              <div className="px-6 py-4 border-t border-border flex justify-between">
                <Button variant="ghost" onClick={() => setStep('scan')}>
                  Back
                </Button>
                <Button
                  variant="primary"
                  icon={<Package className="w-4 h-4" />}
                  onClick={handleGatherEvidence}
                  disabled={selectedSources.size === 0}
                >
                  Gather {selectedSources.size} Source{selectedSources.size !== 1 ? 's' : ''}
                </Button>
              </div>
            </div>
          )}
          
          {/* Step: Gather */}
          {step === 'gather' && (
            <div className="p-6 text-center">
              <div className="w-20 h-20 bg-accent-purple/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Loader2 className="w-10 h-10 text-accent-purple animate-spin" />
              </div>
              <h3 className="text-lg font-semibold text-text-primary mb-2">
                Gathering Evidence
              </h3>
              <p className="text-text-secondary mb-6">
                Collecting and organizing {selectedSources.size} source{selectedSources.size !== 1 ? 's' : ''}...
              </p>
              <div className="max-w-md mx-auto">
                <ProgressBar value={gatherProgress} max={100} color="purple" />
                <p className="text-sm text-text-muted mt-2">{gatherProgress}%</p>
              </div>
            </div>
          )}
          
          {/* Step: Complete */}
          {step === 'complete' && gatheredEvidence && (
            <div className="p-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-accent-green/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="w-8 h-8 text-accent-green" />
                </div>
                <h3 className="text-lg font-semibold text-text-primary mb-1">
                  Evidence Gathered
                </h3>
                <p className="text-text-secondary">
                  {gatheredEvidence.summary}
                </p>
              </div>
              
              {/* Summary Card */}
              <div className="bg-surface-card border border-border rounded-lg p-4 mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <ListChecks className="w-5 h-5 text-accent-blue" />
                  <h4 className="font-medium text-text-primary">Evidence Summary</h4>
                </div>
                <div className="bg-surface rounded-lg p-3 font-mono text-sm text-text-secondary whitespace-pre-wrap">
                  {gatheredEvidence.suggestedText}
                </div>
              </div>
              
              {/* Citations */}
              <div className="bg-surface-card border border-border rounded-lg p-4 mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-text-primary">Citations</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<Copy className="w-3.5 h-3.5" />}
                    onClick={() => navigator.clipboard.writeText(gatheredEvidence.citations.join('\n'))}
                  >
                    Copy All
                  </Button>
                </div>
                <div className="space-y-1">
                  {gatheredEvidence.citations.map((citation, idx) => (
                    <div
                      key={idx}
                      className="text-sm text-text-secondary font-mono bg-surface px-2 py-1 rounded"
                    >
                      {citation}
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="flex justify-center gap-3">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setStep('select');
                    setGatheredEvidence(null);
                  }}
                >
                  Modify Selection
                </Button>
                <Button
                  variant="primary"
                  icon={<ArrowRight className="w-4 h-4" />}
                  onClick={handleComplete}
                >
                  Use Evidence
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default HAQEvidenceGatherer;
