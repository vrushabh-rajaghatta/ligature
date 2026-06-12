

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useAppStore } from '@/store/useAppStore';
import {
  Sparkles,
  FileText,
  FolderOpen,
  Play,
  Pause,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  ChevronRight,
  ChevronDown,
  ChevronLeft,
  Plus,
  Search,
  Filter,
  Download,
  Upload,
  Eye,
  Edit,
  Copy,
  Trash2,
  Settings,
  BookOpen,
  Database,
  Link2,
  FileCheck,
  AlertCircle,
  Zap,
  Target,
  BarChart3,
  Layers,
  ArrowRight,
  CheckSquare,
  Square,
  MoreHorizontal,
  ExternalLink,
  History,
  Pill,
  FlaskConical,
  Shield,
  Beaker,
  Activity,
  TrendingUp
} from 'lucide-react';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Badge, BadgeColor } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardContent, StatCard } from '@/components/ui/Card';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { useToast } from '@/components/ui/Toast';
// v0.25.8: Document template style service for consistent formatting
import { 
  documentTemplateStyleService, 
  getDocumentTemplateCSS, 
  type DocumentType 
} from '@/services/document-template-style-service';

// ============================================================================
// TYPES
// ============================================================================

type AIGenerationView = 'templates' | 'configure' | 'generate' | 'review' | 'history';
type GenerationStatus = 'configuring' | 'source-selection' | 'generating' | 'reviewing' | 'complete' | 'failed';
type SectionStatus = 'pending' | 'generating' | 'generated' | 'reviewed' | 'approved' | 'rejected';

interface DocumentTemplate {
  id: string;
  name: string;
  documentType: string;
  ctdSection: string;
  description: string;
  sections: number;
  estimatedWords: string;
  ichGuidelines: string[];
  aiEnabled: boolean;
  popularity: number;
}

interface SourceDocument {
  id: string;
  title: string;
  category: string;
  version: string;
  pages: number;
  studyId?: string;
  productName: string;
  indexed: boolean;
  selected: boolean;
}

interface GeneratedSection {
  id: string;
  number: string;
  title: string;
  status: SectionStatus;
  wordCount: number;
  citations: number;
  qualityScore: number;
  content?: string;
  generatedAt?: string;
}

interface GenerationSession {
  id: string;
  templateName: string;
  productName: string;
  status: GenerationStatus;
  progress: number;
  sectionsTotal: number;
  sectionsComplete: number;
  wordCount: number;
  citations: number;
  startedAt: string;
  estimatedCompletion?: string;
}

// ============================================================================
// MOCK DATA
// ============================================================================

const MOCK_TEMPLATES: DocumentTemplate[] = [
  {
    id: 'tpl-001',
    name: 'Clinical Overview (Module 2.5)',
    documentType: 'module-25',
    ctdSection: '2.5',
    description: 'Comprehensive clinical overview for NDA/BLA submissions, covering biopharmaceutics, clinical pharmacology, efficacy, and safety.',
    sections: 6,
    estimatedWords: '15,000 - 40,000',
    ichGuidelines: ['ICH M4E', 'ICH E3'],
    aiEnabled: true,
    popularity: 95,
  },
  {
    id: 'tpl-002',
    name: 'Clinical Summary - Efficacy (Module 2.7.3)',
    documentType: 'module-273',
    ctdSection: '2.7.3',
    description: 'Summary of clinical efficacy including individual study results, cross-study analyses, and dosing recommendations.',
    sections: 6,
    estimatedWords: '20,000 - 50,000',
    ichGuidelines: ['ICH M4E', 'ICH E3', 'ICH E9'],
    aiEnabled: true,
    popularity: 92,
  },
  {
    id: 'tpl-003',
    name: 'Clinical Summary - Safety (Module 2.7.4)',
    documentType: 'module-274',
    ctdSection: '2.7.4',
    description: 'Comprehensive safety summary covering exposure, adverse events, laboratory findings, and special populations.',
    sections: 7,
    estimatedWords: '25,000 - 60,000',
    ichGuidelines: ['ICH M4E', 'ICH E3', 'ICH E2E'],
    aiEnabled: true,
    popularity: 90,
  },
  {
    id: 'tpl-004',
    name: 'Nonclinical Overview (Module 2.4)',
    documentType: 'module-24',
    ctdSection: '2.4',
    description: 'Overview of nonclinical testing strategy including pharmacology, pharmacokinetics, and toxicology.',
    sections: 5,
    estimatedWords: '5,000 - 15,000',
    ichGuidelines: ['ICH M4S', 'ICH S7A'],
    aiEnabled: true,
    popularity: 85,
  },
  {
    id: 'tpl-005',
    name: 'Investigator Brochure',
    documentType: 'ib',
    ctdSection: '5.3.5',
    description: 'Complete investigator brochure with nonclinical and clinical data summaries.',
    sections: 12,
    estimatedWords: '8,000 - 20,000',
    ichGuidelines: ['ICH E6'],
    aiEnabled: true,
    popularity: 88,
  },
  {
    id: 'tpl-006',
    name: 'Clinical Study Report (ICH E3)',
    documentType: 'csr',
    ctdSection: '5.3.5',
    description: 'Full clinical study report following ICH E3 structure.',
    sections: 16,
    estimatedWords: '30,000 - 80,000',
    ichGuidelines: ['ICH E3', 'ICH E9'],
    aiEnabled: true,
    popularity: 98,
  },
];

const MOCK_SOURCES: SourceDocument[] = [
  { id: 'src-001', title: 'LIG-2847-301 Clinical Study Report', category: 'Clinical Study Report', version: '2.0', pages: 450, studyId: 'LIG-2847-301', productName: 'Nexavant', indexed: true, selected: false },
  { id: 'src-002', title: 'LIG-2847-301 Statistical Analysis Report', category: 'Statistical Report', version: '1.0', pages: 120, studyId: 'LIG-2847-301', productName: 'Nexavant', indexed: true, selected: false },
  { id: 'src-003', title: 'Integrated Safety Database Analysis', category: 'Safety Database', version: '3.1', pages: 85, productName: 'Nexavant', indexed: true, selected: false },
  { id: 'src-004', title: 'Population PK Model Report', category: 'PK Report', version: '1.2', pages: 65, productName: 'Nexavant', indexed: true, selected: false },
  { id: 'src-005', title: 'Nexavant Investigator Brochure', category: 'Investigator Brochure', version: '8.0', pages: 180, productName: 'Nexavant', indexed: true, selected: false },
  { id: 'src-006', title: 'Carcinogenicity Study Report (26-week)', category: 'Toxicology Report', version: '1.0', pages: 220, productName: 'Nexavant', indexed: true, selected: false },
  { id: 'src-007', title: 'LIG-2847-201 Phase 2 CSR', category: 'Clinical Study Report', version: '1.0', pages: 380, studyId: 'LIG-2847-201', productName: 'Nexavant', indexed: true, selected: false },
  { id: 'src-008', title: 'Literature Review - Mechanism of Action', category: 'Literature Review', version: '2.0', pages: 45, productName: 'Nexavant', indexed: false, selected: false },
];

const MOCK_SECTIONS: GeneratedSection[] = [
  { id: 'sec-001', number: '2.5.1', title: 'Product Development Rationale', status: 'approved', wordCount: 2450, citations: 8, qualityScore: 94 },
  { id: 'sec-002', number: '2.5.2', title: 'Overview of Biopharmaceutics', status: 'approved', wordCount: 1850, citations: 5, qualityScore: 91 },
  { id: 'sec-003', number: '2.5.3', title: 'Overview of Clinical Pharmacology', status: 'reviewed', wordCount: 3200, citations: 12, qualityScore: 88 },
  { id: 'sec-004', number: '2.5.4', title: 'Overview of Efficacy', status: 'generating', wordCount: 0, citations: 0, qualityScore: 0 },
  { id: 'sec-005', number: '2.5.5', title: 'Overview of Safety', status: 'pending', wordCount: 0, citations: 0, qualityScore: 0 },
  { id: 'sec-006', number: '2.5.6', title: 'Benefits and Risks Conclusions', status: 'pending', wordCount: 0, citations: 0, qualityScore: 0 },
];

const MOCK_SESSION: GenerationSession = {
  id: 'session-001',
  templateName: 'Clinical Overview (Module 2.5)',
  productName: 'Nexavant (LIG-2847)',
  status: 'generating',
  progress: 52,
  sectionsTotal: 6,
  sectionsComplete: 3,
  wordCount: 7500,
  citations: 25,
  startedAt: '2025-12-30T14:30:00Z',
  estimatedCompletion: '2025-12-30T15:15:00Z',
};

// ============================================================================
// COLOR MAPS
// ============================================================================

const STATUS_COLORS: Record<SectionStatus, BadgeColor> = {
  'pending': 'slate',
  'generating': 'amber',
  'generated': 'blue',
  'reviewed': 'purple',
  'approved': 'green',
  'rejected': 'red',
};

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  'Clinical Study Report': <FileText className="w-4 h-4" />,
  'Statistical Report': <BarChart3 className="w-4 h-4" />,
  'Safety Database': <Shield className="w-4 h-4" />,
  'PK Report': <Activity className="w-4 h-4" />,
  'Investigator Brochure': <BookOpen className="w-4 h-4" />,
  'Toxicology Report': <Beaker className="w-4 h-4" />,
  'Literature Review': <BookOpen className="w-4 h-4" />,
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function AIDocumentGenerationScreen() {
  const setActiveModule = useAppStore(s => s.setActiveModule);

  const [activeView, setActiveView] = useState<AIGenerationView>('templates');
  const [showConfig, setShowConfig] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate | null>(null);
  // Pre-select first 3 sources so Configure tab looks immediately useful
  const [sources, setSources] = useState<SourceDocument[]>(
    MOCK_SOURCES.map((s, i) => ({ ...s, selected: i < 3 }))
  );
  const [showAddSourceInput, setShowAddSourceInput] = useState(false);
  const [newSourceTitle, setNewSourceTitle] = useState('');
  const [sections, setSections] = useState<GeneratedSection[]>(MOCK_SECTIONS);
  const [session, setSession] = useState<GenerationSession | null>(null);
  const [searchText, setSearchText] = useState('');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [showSourcePanel, setShowSourcePanel] = useState(true);
  const [isLiveGenerating, setIsLiveGenerating] = useState(false);
  const generationTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const toast = useToast();

  // Live generation animation — advances sections one by one
  const advanceGeneration = useCallback(() => {
    setSections(prev => {
      const generating = prev.findIndex(s => s.status === 'generating');
      const pending    = prev.findIndex(s => s.status === 'pending');

      if (generating === -1 && pending === -1) {
        setIsLiveGenerating(false);
        setSession(s => s ? { ...s, status: 'complete', progress: 100, sectionsComplete: prev.length } : s);
        setTimeout(() => {
          toast.success('Document generation complete — review your sections');
          setActiveView('review');
        }, 0);
        return prev;
      }

      const next = prev.map((sec, i) => {
        if (i === generating) {
          const words = 1800 + Math.floor(Math.random() * 1800);
          const cits  = 4 + Math.floor(Math.random() * 10);
          return { ...sec, status: 'generated' as SectionStatus, wordCount: words, citations: cits, qualityScore: 85 + Math.floor(Math.random() * 14) };
        }
        if (generating !== -1 && i === generating + 1 && sec.status === 'pending') {
          return { ...sec, status: 'generating' as SectionStatus };
        }
        if (generating === -1 && i === pending) {
          return { ...sec, status: 'generating' as SectionStatus };
        }
        return sec;
      });

      const complete = next.filter(s => ['generated','reviewed','approved'].includes(s.status)).length;
      setSession(s => s ? { ...s, progress: Math.min(98, Math.round((complete / s.sectionsTotal) * 100)), sectionsComplete: complete } : s);
      return next;
    });
  }, [toast]);

  useEffect(() => {
    if (isLiveGenerating) {
      generationTimer.current = setInterval(advanceGeneration, 2200);
    } else {
      if (generationTimer.current) { clearInterval(generationTimer.current); generationTimer.current = null; }
    }
    return () => { if (generationTimer.current) { clearInterval(generationTimer.current); generationTimer.current = null; } };
  }, [isLiveGenerating, advanceGeneration]);

  // Select/deselect source
  const toggleSource = (sourceId: string) => {
    setSources(prev => prev.map(s => 
      s.id === sourceId ? { ...s, selected: !s.selected } : s
    ));
  };

  // Select all sources
  const selectAllSources = () => {
    setSources(prev => prev.map(s => ({ ...s, selected: true })));
  };

  // Clear source selection
  const clearSourceSelection = () => {
    setSources(prev => prev.map(s => ({ ...s, selected: false })));
  };

  // Selected sources
  const selectedSources = useMemo(() => sources.filter(s => s.selected), [sources]);

  // Start generation
  const startGeneration = () => {
    if (!selectedTemplate) return;
    // Reset sections to pending/generating state
    setSections(MOCK_SECTIONS.map((s, i) => ({
      ...s,
      status: i === 0 ? 'generating' : 'pending',
      wordCount: 0, citations: 0, qualityScore: 0,
    })));
    setSession({
      ...MOCK_SESSION,
      templateName: selectedTemplate.name,
      productName: 'Nexavant (LIG-2847)',
      status: 'generating',
      progress: 0,
      sectionsComplete: 0,
    });
    setIsLiveGenerating(true);
    setActiveView('generate');
  };

  // Toggle section expansion
  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  // Stats
  const stats = useMemo(() => ({
    totalSources: sources.length,
    selectedSources: selectedSources.length,
    indexedSources: sources.filter(s => s.indexed).length,
    sectionsComplete: sections.filter(s => ['approved', 'reviewed', 'generated'].includes(s.status)).length,
    totalWordCount: sections.reduce((acc, s) => acc + s.wordCount, 0),
    totalCitations: sections.reduce((acc, s) => acc + s.citations, 0),
    avgQuality: sections.filter(s => s.qualityScore > 0).reduce((acc, s, _, arr) => acc + s.qualityScore / arr.length, 0),
  }), [sources, selectedSources, sections]);

  // ============================================================================
  // RENDER TEMPLATES VIEW
  // ============================================================================

  const renderTemplatesView = () => (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-text-primary">Document Templates</h2>
          <p className="text-sm text-text-secondary mt-1">Select a template to begin AI-assisted document generation</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              placeholder="Search templates..."
              className="pl-9 pr-4 py-2 bg-surface-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent-blue"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        {MOCK_TEMPLATES.filter(t => 
          searchText === '' || 
          t.name.toLowerCase().includes(searchText.toLowerCase()) ||
          t.description.toLowerCase().includes(searchText.toLowerCase())
        ).map(template => (
          <Card
            key={template.id}
            className={`cursor-pointer transition-all hover:border-accent-blue ${
              selectedTemplate?.id === template.id ? 'ring-2 ring-accent-blue border-accent-blue' : ''
            }`}
            onClick={() => setSelectedTemplate(template)}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-accent-purple/10 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-accent-purple" />
                  </div>
                  <div>
                    <h3 className="font-medium text-text-primary">{template.name}</h3>
                    <p className="text-xs text-text-muted">CTD {template.ctdSection}</p>
                  </div>
                </div>
                {template.aiEnabled && (
                  <Badge color="purple" size="sm">AI Ready</Badge>
                )}
              </div>
              <p className="text-sm text-text-secondary mt-3 line-clamp-2">{template.description}</p>
              <div className="flex items-center gap-4 mt-4 text-xs text-text-muted">
                <span className="flex items-center gap-1">
                  <Layers className="w-3 h-3" />
                  {template.sections} sections
                </span>
                <span className="flex items-center gap-1">
                  <FileText className="w-3 h-3" />
                  {template.estimatedWords} words
                </span>
                <span className="flex items-center gap-1">
                  <BookOpen className="w-3 h-3" />
                  {template.ichGuidelines.join(', ')}
                </span>
              </div>
              <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <TrendingUp className="w-3 h-3 text-accent-green" />
                  <span className="text-xs text-text-muted">{template.popularity}% usage</span>
                </div>
                {selectedTemplate?.id === template.id && (
                  <Button variant="primary" size="sm" onClick={(e) => { e.stopPropagation(); setActiveView('configure'); }}>
                    Configure <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  // ============================================================================
  // RENDER CONFIGURE VIEW
  // ============================================================================

  const renderConfigureView = () => (
    <div className="flex gap-6 h-full">
      {/* Main Configuration */}
      <div className="flex-1 space-y-4 md:space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => setActiveView('templates')}>
            <ChevronLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <div>
            <h2 className="text-xl font-semibold text-text-primary">{selectedTemplate?.name}</h2>
            <p className="text-sm text-text-secondary">Configure sources and generation settings</p>
          </div>
        </div>

        {/* Product Selection */}
        <Card>
          <CardHeader>
            <h3 className="font-semibold text-text-primary flex items-center gap-2">
              <Pill className="w-4 h-4 text-accent-blue" />
              Product Context
            </h3>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="text-sm text-text-muted block mb-1">Product</label>
                <select className="w-full px-3 py-2 bg-surface-card border border-border rounded-lg text-sm">
                  <option>Nexavant (LIG-2847)</option>
                  <option>Velorix (LIG-3301)</option>
                  <option>LIG-4521</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-text-muted block mb-1">Indication</label>
                <select className="w-full px-3 py-2 bg-surface-card border border-border rounded-lg text-sm">
                  <option>Advanced Solid Tumors</option>
                  <option>NSCLC - First Line</option>
                  <option>NSCLC - Second Line</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Source Selection Summary */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-text-primary flex items-center gap-2">
                <Database className="w-4 h-4 text-accent-purple" />
                Source Documents
              </h3>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={selectAllSources}>Select All</Button>
                <Button variant="ghost" size="sm" onClick={clearSourceSelection}>Clear</Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {sources.map(source => (
                <div
                  key={source.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                    source.selected 
                      ? 'border-accent-blue bg-accent-blue/5' 
                      : 'border-border bg-surface-card hover:bg-surface-elevated'
                  }`}
                  onClick={() => toggleSource(source.id)}
                >
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                    source.selected ? 'bg-accent-blue border-accent-blue' : 'border-border'
                  }`}>
                    {source.selected && <CheckCircle className="w-3 h-3 text-white" />}
                  </div>
                  <div className="w-8 h-8 rounded bg-surface-elevated flex items-center justify-center text-text-muted">
                    {CATEGORY_ICONS[source.category] || <FileText className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-text-primary text-sm truncate">{source.title}</div>
                    <div className="text-xs text-text-muted">{source.category} • v{source.version} • {source.pages} pages</div>
                  </div>
                  {source.indexed ? (
                    <Badge color="green" size="sm">Indexed</Badge>
                  ) : (
                    <Badge color="amber" size="sm">Not Indexed</Badge>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
              <span className="text-sm text-text-muted">
                {selectedSources.length} of {sources.length} sources selected
              </span>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowAddSourceInput(v => !v)}
              >
                <Upload className="w-4 h-4 mr-1" /> Add Source
              </Button>
            </div>
            {showAddSourceInput && (
              <div className="flex items-center gap-2 mt-2 px-4 pb-3">
                <input
                  autoFocus
                  value={newSourceTitle}
                  onChange={e => setNewSourceTitle(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && newSourceTitle.trim()) {
                      const newSrc: SourceDocument = {
                        id: `src-${Date.now()}`,
                        title: newSourceTitle.trim(),
                        category: 'Custom',
                        version: '1.0',
                        pages: 0,
                        productName: 'Manual',
                        indexed: true,
                        selected: true,
                      };
                      setSources(prev => [...prev, newSrc]);
                      setNewSourceTitle('');
                      setShowAddSourceInput(false);
                      toast.success(`Source "${newSrc.title}" added and selected`);
                    } else if (e.key === 'Escape') {
                      setShowAddSourceInput(false);
                      setNewSourceTitle('');
                    }
                  }}
                  placeholder="Source document title — press Enter"
                  className="flex-1 px-3 py-1.5 text-sm bg-surface border border-accent-blue rounded text-text-primary placeholder:text-text-muted focus:outline-none"
                />
                <button onClick={() => { setShowAddSourceInput(false); setNewSourceTitle(''); }} className="text-xs text-text-muted hover:text-text-primary">✕</button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Generation Settings */}
        <Card>
          <CardHeader>
            <h3 className="font-semibold text-text-primary flex items-center gap-2">
              <Settings className="w-4 h-4 text-text-muted" />
              Generation Settings
            </h3>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
              <div>
                <label className="text-sm text-text-muted block mb-1">Generation Mode</label>
                <select className="w-full px-3 py-2 bg-surface-card border border-border rounded-lg text-sm">
                  <option>Full Document</option>
                  <option>Section by Section</option>
                  <option>Outline First</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-text-muted block mb-1">Content Style</label>
                <select className="w-full px-3 py-2 bg-surface-card border border-border rounded-lg text-sm">
                  <option>Regulatory Formal</option>
                  <option>Regulatory Concise</option>
                  <option>Executive Summary</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-text-muted block mb-1">Quality Threshold</label>
                <select className="w-full px-3 py-2 bg-surface-card border border-border rounded-lg text-sm">
                  <option>High (90%+)</option>
                  <option>Standard (75%+)</option>
                  <option>Draft (60%+)</option>
                </select>
              </div>
            </div>
            <div className="flex items-center gap-6 mt-4 pt-4 border-t border-border">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" defaultChecked className="rounded" />
                <span>ICH Compliance Check</span>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" defaultChecked className="rounded" />
                <span>AMA Style Check</span>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" defaultChecked className="rounded" />
                <span>Citation Verification</span>
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Start Button */}
        <div className="flex items-center justify-end gap-4">
          <Button 
            variant="outline" 
            size="lg"
            onClick={() => {
              toast.success('Configuration saved');
            }}
          >
            Save Configuration
          </Button>
          <Button 
            variant="primary" 
            size="lg" 
            onClick={startGeneration}
            disabled={selectedSources.length === 0}
          >
            <Sparkles className="w-5 h-5 mr-2" />
            Start Generation
          </Button>
        </div>
      </div>

      {/* Preview Panel */}
      <div className="hidden xl:block w-80 border-l border-border pl-6">
        <h3 className="font-semibold text-text-primary mb-4">Document Preview</h3>
        <div className="space-y-2">
          {MOCK_SECTIONS.map(section => (
            <div key={section.id} className="p-3 bg-surface-card rounded-lg border border-border">
              <div className="text-sm font-medium text-text-primary">{section.number} {section.title}</div>
              <div className="text-xs text-text-muted mt-1">
                Est. 2,000-4,000 words
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 p-3 bg-surface-elevated rounded-lg">
          <div className="text-sm text-text-muted">Estimated Output</div>
          <div className="text-2xl font-bold text-text-primary mt-1">15,000 - 25,000</div>
          <div className="text-xs text-text-muted">words</div>
        </div>
      </div>
    </div>
  );

  // ============================================================================
  // RENDER GENERATE VIEW
  // ============================================================================

  const renderGenerateView = () => (
    <div className="flex gap-6 h-full">
      {/* Main Generation Panel */}
      <div className="flex-1 space-y-4">
        {/* Progress Header */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-accent-purple/10 flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-accent-purple animate-pulse" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-text-primary">{session?.templateName}</h2>
                  <p className="text-sm text-text-secondary">{session?.productName}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setIsLiveGenerating(v => {
                      toast.info(v ? 'Generation paused' : 'Generation resumed');
                      return !v;
                    });
                  }}
                >
                  {isLiveGenerating
                    ? <><Pause className="w-4 h-4 mr-1" /> Pause</>
                    : <><Play className="w-4 h-4 mr-1" /> Resume</>}
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setIsLiveGenerating(false);
                    setSections(MOCK_SECTIONS.map((s, i) => ({
                      ...s, status: i === 0 ? 'generating' : 'pending',
                      wordCount: 0, citations: 0, qualityScore: 0,
                    })));
                    setSession(s => s ? { ...s, progress: 0, sectionsComplete: 0, status: 'generating' } : s);
                    setTimeout(() => setIsLiveGenerating(true), 100);
                    toast.info('Generation restarted');
                  }}
                >
                  <RefreshCw className="w-4 h-4 mr-1" /> Restart
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-text-muted">Overall Progress</span>
                <span className="font-medium text-text-primary">{session?.progress}%</span>
              </div>
              <div className="h-3 bg-surface-elevated rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-accent-purple to-accent-blue transition-all duration-500"
                  style={{ width: `${session?.progress}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs text-text-muted">
                <span>{session?.sectionsComplete} of {session?.sectionsTotal} sections complete</span>
                <span>Est. completion: {session?.estimatedCompletion ? new Date(session.estimatedCompletion).toLocaleTimeString() : '--'}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Bar */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
          <StatCard label="Words Generated" value={stats.totalWordCount.toLocaleString()} icon={<FileText className="w-5 h-5" />} />
          <StatCard label="Citations" value={stats.totalCitations} icon={<Link2 className="w-5 h-5" />} />
          <StatCard label="Avg Quality" value={`${Math.round(stats.avgQuality)}%`} icon={<Target className="w-5 h-5" />} trend={{ value: 3, direction: 'up' }} />
          <StatCard label="Sources Used" value={selectedSources.length} icon={<Database className="w-5 h-5" />} />
        </div>

        {/* Sections List */}
        <Card>
          <CardHeader>
            <h3 className="font-semibold text-text-primary">Generation Progress</h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {sections.map(section => (
                <div key={section.id} className="border border-border rounded-lg overflow-hidden">
                  <div 
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-surface-elevated transition-colors"
                    onClick={() => toggleSection(section.id)}
                  >
                    <div className="flex items-center gap-3">
                      {section.status === 'generating' ? (
                        <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
                          <RefreshCw className="w-4 h-4 text-amber-600 animate-spin" />
                        </div>
                      ) : section.status === 'approved' ? (
                        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        </div>
                      ) : section.status === 'pending' ? (
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                          <Clock className="w-4 h-4 text-slate-400" />
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                          <FileText className="w-4 h-4 text-blue-600" />
                        </div>
                      )}
                      <div>
                        <div className="font-medium text-text-primary">{section.number} {section.title}</div>
                        <div className="text-xs text-text-muted">
                          {section.wordCount > 0 ? `${section.wordCount.toLocaleString()} words • ${section.citations} citations` : 'Pending generation'}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge color={STATUS_COLORS[section.status]} size="sm">
                        {section.status}
                      </Badge>
                      {section.qualityScore > 0 && (
                        <div className={`text-sm font-medium ${
                          section.qualityScore >= 90 ? 'text-green-600' :
                          section.qualityScore >= 75 ? 'text-blue-600' :
                          'text-amber-600'
                        }`}>
                          {section.qualityScore}%
                        </div>
                      )}
                      {expandedSections.has(section.id) ? (
                        <ChevronDown className="w-5 h-5 text-text-muted" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-text-muted" />
                      )}
                    </div>
                  </div>
                  
                  {expandedSections.has(section.id) && section.status !== 'pending' && (
                    <div className="border-t border-border p-4 bg-surface-elevated">
                      {section.status === 'generating' ? (
                        <div className="flex items-center gap-3 text-amber-600">
                          <RefreshCw className="w-5 h-5 animate-spin" />
                          <span>Generating content...</span>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {/* v0.25.8: Apply document template styling to generated content */}
                          <style dangerouslySetInnerHTML={{ __html: getDocumentTemplateCSS('module-25') }} />
                          <div className="document-template-content bg-white rounded-lg border border-slate-200 p-6 max-w-none">
                            <h4 style={{ fontSize: '12pt', fontWeight: 600, marginBottom: '9pt', color: '#000' }}>
                              {section.number} {section.title}
                            </h4>
                            <p style={{ fontFamily: "'Times New Roman', Times, serif", fontSize: '12pt', lineHeight: 1.5, textAlign: 'justify', marginBottom: '12pt', color: '#000' }}>
                              The clinical pharmacology of Nexavant has been characterized through a comprehensive program 
                              of in vitro and clinical studies. Population pharmacokinetic modeling was performed using data 
                              from 1,247 subjects across Phase 1-3 studies. <span className="text-xs text-slate-500">[Source: Population PK Model Report, Section 3.1]</span>
                            </p>
                            <p style={{ fontFamily: "'Times New Roman', Times, serif", fontSize: '12pt', lineHeight: 1.5, textAlign: 'justify', marginBottom: '12pt', color: '#000' }}>
                              Nexavant exhibits dose-proportional pharmacokinetics over the 100-400 mg dose range evaluated 
                              in clinical studies. The geometric mean (%CV) terminal half-life is 12.4 hours (32.1%). 
                              <span className="text-xs text-slate-500">[Source: LIG-2847-301 Clinical Study Report, Section 11.4]</span>
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                toast.info('Opening section preview...');
                              }}
                            >
                              <Eye className="w-4 h-4 mr-1" /> Preview
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                toast.info('Opening section editor...');
                              }}
                            >
                              <Edit className="w-4 h-4 mr-1" /> Edit
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                toast.info('Regenerating section...');
                              }}
                            >
                              <RefreshCw className="w-4 h-4 mr-1" /> Regenerate
                            </Button>
                            <div className="flex-1" />
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="text-red-600 hover:bg-red-50"
                              onClick={() => {
                                setSections(prev => prev.map(s => 
                                  s.id === section.id ? { ...s, status: 'rejected' } : s
                                ));
                                toast.error('Section rejected');
                              }}
                            >
                              <XCircle className="w-4 h-4 mr-1" /> Reject
                            </Button>
                            <Button 
                              variant="primary" 
                              size="sm"
                              onClick={() => {
                                setSections(prev => prev.map(s => 
                                  s.id === section.id ? { ...s, status: 'approved' } : s
                                ));
                                toast.success('Section approved');
                              }}
                            >
                              <CheckCircle className="w-4 h-4 mr-1" /> Approve
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Source Panel */}
      {showSourcePanel && (
        <div className="hidden xl:block w-80 border-l border-border pl-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-text-primary">Active Sources</h3>
            <Button variant="ghost" size="sm" onClick={() => setShowSourcePanel(false)}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          <div className="space-y-2">
            {selectedSources.map(source => (
              <div key={source.id} className="p-3 bg-surface-card rounded-lg border border-border">
                <div className="flex items-center gap-2">
                  {CATEGORY_ICONS[source.category] || <FileText className="w-4 h-4" />}
                  <span className="text-sm font-medium text-text-primary truncate">{source.title}</span>
                </div>
                <div className="text-xs text-text-muted mt-1">{source.category}</div>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-border">
                  <span className="text-xs text-text-muted">{source.pages} pages</span>
                  <Badge color="green" size="sm">Active</Badge>
                </div>
              </div>
            ))}
          </div>
          
          {/* Quality Panel */}
          <div className="pt-4 border-t border-border">
            <h3 className="font-semibold text-text-primary mb-3">Quality Checks</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-text-secondary">ICH E3 Structure</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-text-secondary">AMA 11th Style</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <span className="text-text-secondary">Citation Density (2 warnings)</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-text-secondary">Statistical Formatting</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // ============================================================================
  // RENDER REVIEW VIEW
  // ============================================================================

  const renderReviewView = () => {
    const generated = sections.filter(s => ['generated','reviewed','approved'].includes(s.status));
    const allApproved = generated.length > 0 && generated.every(s => s.status === 'approved');
    const totalWords = sections.reduce((s, sec) => s + sec.wordCount, 0);
    const totalCitations = sections.reduce((s, sec) => s + sec.citations, 0);
    const avgQuality = generated.length > 0
      ? Math.round(generated.reduce((s, sec) => s + sec.qualityScore, 0) / generated.length)
      : 0;

    return (
      <div className="flex gap-6 h-full">
        <div className="flex-1 space-y-4 overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-text-primary">
                {session?.templateName ?? 'Generated Document'} — Review
              </h2>
              <p className="text-sm text-text-muted mt-0.5">
                {generated.length} of {sections.length} sections generated ·
                {totalWords.toLocaleString()} words · {totalCitations} citations
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => {
                setSections(prev => prev.map(s =>
                  s.status === 'generated' ? { ...s, status: 'approved' as SectionStatus } : s
                ));
                toast.success('All sections approved');
              }}>
                <CheckCircle className="w-4 h-4 mr-1 text-green-500" /> Approve All
              </Button>
              <Button variant="primary" size="sm" disabled={!allApproved} onClick={() => {
                setActiveModule('authoring');
                toast.success(`${session?.templateName ?? 'Document'} sent to Authoring`);
              }}>
                <FileCheck className="w-4 h-4 mr-1" /> Send to Authoring
              </Button>
            </div>
          </div>

          {/* Section review cards */}
          {sections.map(sec => (
            <Card key={sec.id} className={`border ${
              sec.status === 'approved' ? 'border-green-500/30' :
              sec.status === 'reviewed' ? 'border-accent-blue/30' :
              sec.status === 'generated' ? 'border-border' :
              'border-border opacity-40'
            }`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      sec.status === 'approved' ? 'bg-green-500/15' :
                      sec.status === 'generating' ? 'bg-amber-500/15' :
                      sec.status === 'pending' ? 'bg-surface-elevated' : 'bg-accent-blue/10'
                    }`}>
                      {sec.status === 'approved' ? <CheckCircle className="w-4 h-4 text-green-500" /> :
                       sec.status === 'generating' ? <RefreshCw className="w-4 h-4 text-amber-500 animate-spin" /> :
                       sec.status === 'pending' ? <Clock className="w-4 h-4 text-text-muted" /> :
                       <FileText className="w-4 h-4 text-accent-blue" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs text-text-muted">{sec.number}</span>
                        <span className="font-semibold text-text-primary text-sm">{sec.title}</span>
                        <Badge color={STATUS_COLORS[sec.status]} size="sm">{sec.status}</Badge>
                      </div>
                      {sec.wordCount > 0 && (
                        <div className="flex items-center gap-4 mt-1.5 text-xs text-text-muted">
                          <span>{sec.wordCount.toLocaleString()} words</span>
                          <span>{sec.citations} citations</span>
                          {sec.qualityScore > 0 && (
                            <span className={`font-semibold ${sec.qualityScore >= 90 ? 'text-green-400' : sec.qualityScore >= 75 ? 'text-amber-400' : 'text-red-400'}`}>
                              Quality: {sec.qualityScore}%
                            </span>
                          )}
                        </div>
                      )}
                      {sec.status === 'pending' && (
                        <p className="text-xs text-text-muted mt-1">Awaiting generation…</p>
                      )}
                      {sec.status === 'generating' && (
                        <p className="text-xs text-amber-400 mt-1">Generating section content…</p>
                      )}
                      {['generated','reviewed'].includes(sec.status) && (
                        <p className="text-xs text-text-muted mt-2 leading-relaxed line-clamp-2">
                          AI-generated content synthesised from {selectedSources.length} indexed source documents.
                          Section covers regulatory requirements per ICH M4E guidelines.
                        </p>
                      )}
                    </div>
                  </div>
                  {['generated','reviewed'].includes(sec.status) && (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button variant="ghost" size="sm" onClick={() => {
                        setSections(prev => prev.map(s =>
                          s.id === sec.id ? { ...s, status: 'reviewed' as SectionStatus } : s
                        ));
                        toast.info(`Section ${sec.number} marked as reviewed`);
                      }}>
                        <Eye className="w-4 h-4 mr-1" /> Review
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => {
                        setSections(prev => prev.map(s =>
                          s.id === sec.id ? { ...s, status: 'approved' as SectionStatus } : s
                        ));
                        toast.success(`Section ${sec.number} approved`);
                      }}>
                        <CheckCircle className="w-4 h-4 mr-1 text-green-500" /> Approve
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Send to Authoring CTA when all approved */}
          {allApproved && (
            <div className="flex items-center justify-between p-4 bg-green-500/8 border border-green-500/20 rounded-xl">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <div>
                  <div className="text-sm font-semibold text-green-400">All sections approved</div>
                  <div className="text-xs text-text-muted">{totalWords.toLocaleString()} words · Avg quality {avgQuality}%</div>
                </div>
              </div>
              <Button variant="primary" size="sm" onClick={() => {
                setActiveModule('authoring');
                toast.success(`${session?.templateName ?? 'Document'} sent to Authoring for final edit`);
              }}>
                <Sparkles className="w-4 h-4 mr-1" /> Open in Authoring
              </Button>
            </div>
          )}
        </div>

        {/* Right panel — quality summary */}
        <div className="hidden xl:block w-64 flex-shrink-0 space-y-4">
          <Card>
            <CardHeader><h3 className="text-sm font-semibold text-text-primary">Document Quality</h3></CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: 'Overall Quality', value: `${avgQuality}%`, color: avgQuality >= 90 ? 'text-green-400' : 'text-amber-400' },
                { label: 'Total Words', value: totalWords.toLocaleString(), color: 'text-text-primary' },
                { label: 'Citations', value: String(totalCitations), color: 'text-text-primary' },
                { label: 'Sections Approved', value: `${sections.filter(s => s.status === 'approved').length}/${sections.length}`, color: 'text-text-primary' },
              ].map(m => (
                <div key={m.label} className="flex items-center justify-between">
                  <span className="text-xs text-text-muted">{m.label}</span>
                  <span className={`text-sm font-semibold ${m.color}`}>{m.value}</span>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><h3 className="text-sm font-semibold text-text-primary">Compliance Checks</h3></CardHeader>
            <CardContent className="space-y-2">
              {[
                { label: 'ICH M4E Structure', pass: true },
                { label: 'AMA 11th Style', pass: true },
                { label: 'Citation Density', pass: avgQuality > 80 },
                { label: 'Statistical Formatting', pass: true },
              ].map(c => (
                <div key={c.label} className="flex items-center gap-2 text-xs">
                  {c.pass
                    ? <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                    : <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />}
                  <span className="text-text-secondary">{c.label}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  // ============================================================================
  // RENDER HISTORY VIEW
  // ============================================================================

  const renderHistoryView = () => (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <h3 className="font-semibold text-text-primary">Generation History</h3>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { id: 'h1', template: 'Clinical Overview (2.5)', product: 'Nexavant', date: '2025-12-29', status: 'complete', words: 24500 },
              { id: 'h2', template: 'Safety Summary (2.7.4)', product: 'Nexavant', date: '2025-12-28', status: 'complete', words: 38200 },
              { id: 'h3', template: 'IB Update', product: 'Velorix', date: '2025-12-27', status: 'complete', words: 12800 },
            ].map(item => (
              <div key={item.id} className="flex items-center justify-between p-4 border border-border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-surface-elevated flex items-center justify-center">
                    <History className="w-5 h-5 text-text-muted" />
                  </div>
                  <div>
                    <div className="font-medium text-text-primary">{item.template}</div>
                    <div className="text-sm text-text-muted">{item.product} • {item.date}</div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-text-muted">{item.words.toLocaleString()} words</span>
                  <Badge color="green" size="sm">{item.status}</Badge>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      toast.info(`Opening ${item.template}...`);
                    }}
                  >
                    <Eye className="w-4 h-4 mr-1" /> View
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  return (
    <div className="h-full flex flex-col bg-surface-base">
      <ScreenHeader
        moduleId="ai-generation"
        title="AI Document Generation"
        subtitle="Generate regulatory documents with AI assistance"
        icon={<Sparkles className="w-5 h-5" />}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowConfig(prev => !prev)}>
              <Settings className="w-4 h-4 mr-1" /> Settings
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.open('https://docs.claude.ai', '_blank', 'noopener')}>
              <BookOpen className="w-4 h-4 mr-1" /> Documentation
            </Button>
          </div>
        }
      />

      {/* Step flow indicator */}
      <div className="border-b border-border bg-surface-card px-6">
        <div className="flex items-center gap-1">
          {[
            { id: 'templates', label: 'Templates',  icon: <Layers className="w-4 h-4" />,    step: 1, enabled: true },
            { id: 'configure', label: 'Configure',  icon: <Settings className="w-4 h-4" />,  step: 2, enabled: !!selectedTemplate },
            { id: 'generate',  label: 'Generate',   icon: <Sparkles className="w-4 h-4" />,  step: 3, enabled: !!session },
            { id: 'review',    label: 'Review',     icon: <FileCheck className="w-4 h-4" />, step: 4, enabled: !!session },
            { id: 'history',   label: 'History',    icon: <History className="w-4 h-4" />,   step: 5, enabled: true },
          ].map((tab, i, arr) => (
            <React.Fragment key={tab.id}>
              <button
                onClick={() => tab.enabled && setActiveView(tab.id as AIGenerationView)}
                disabled={!tab.enabled}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors
                  ${activeView === tab.id
                    ? 'border-accent-purple text-accent-purple'
                    : !tab.enabled
                      ? 'border-transparent text-text-muted/40 cursor-not-allowed'
                      : 'border-transparent text-text-muted hover:text-text-primary'}`}
              >
                {/* Step number bubble */}
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                  activeView === tab.id ? 'bg-accent-purple text-white' :
                  tab.enabled && tab.step < (['templates','configure','generate','review','history'].indexOf(activeView) + 1)
                    ? 'bg-green-500 text-white'
                    : tab.enabled ? 'bg-surface-elevated text-text-muted' : 'bg-surface-elevated text-text-muted/40'
                }`}>{tab.step}</span>
                {tab.label}
                {tab.id === 'generate' && isLiveGenerating && (
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                )}
              </button>
              {i < arr.length - 1 && (
                <ChevronRight className="w-3.5 h-3.5 text-text-muted/30 flex-shrink-0" />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {activeView === 'templates' && renderTemplatesView()}
        {activeView === 'configure' && renderConfigureView()}
        {activeView === 'generate' && renderGenerateView()}
        {activeView === 'review' && renderReviewView()}
        {activeView === 'history' && renderHistoryView()}
      </div>
    </div>
  );
}
