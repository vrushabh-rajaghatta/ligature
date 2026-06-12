

import { useState, useMemo } from 'react';
import {
  Sparkles, FileText, Layers, BookOpen, ArrowRight, Check, 
  Database, Link2, Zap, Target, RefreshCw, ChevronRight,
  Info, Brain, Clock, Shield, GitBranch, Package, Globe
} from 'lucide-react';
import { DocumentSection, DocumentType, AuthoringDocument } from '@/types/authoring';
import { componentLibrary } from '@/data/authoring-data';
import { useAuthoringStore } from '@/store/useAuthoringStore';

// ============================================================================
// TYPES
// ============================================================================

export type AuthoringMode = 'section' | 'reuse' | 'document';

interface AIAuthoringModeSelectorProps {
  document: AuthoringDocument;
  currentSection?: DocumentSection;
  onModeSelected: (mode: AuthoringMode, options?: AuthoringModeOptions) => void;
  onCancel?: () => void;
}

interface AuthoringModeOptions {
  sectionIds?: string[];
  componentIds?: string[];
  useSourceDocuments?: boolean;
  skipCompleted?: boolean;
}

interface ModeCardProps {
  mode: AuthoringMode;
  title: string;
  subtitle: string;
  description: string;
  icon: React.ReactNode;
  benefits: string[];
  bestFor: string[];
  estimatedTime?: string;
  dataPoints?: { label: string; value: string }[];
  isSelected: boolean;
  onSelect: () => void;
}

// ============================================================================
// MODE CONFIGURATIONS
// ============================================================================

const modeConfig: Record<AuthoringMode, Omit<ModeCardProps, 'isSelected' | 'onSelect'>> = {
  section: {
    mode: 'section',
    title: 'Author Section',
    subtitle: 'AI drafts a single section',
    description: 'Generate content for one section at a time with full control over sources, instructions, and review.',
    icon: <FileText className="w-6 h-6" />,
    benefits: [
      'Full control over each section',
      'Real-time streaming preview',
      'Section-specific source selection',
      'Immediate review & editing',
    ],
    bestFor: [
      'Complex or critical sections',
      'First-time document types',
      'Sections requiring specific expertise',
    ],
    estimatedTime: '2-5 min per section',
  },
  reuse: {
    mode: 'reuse',
    title: 'Reuse Content',
    subtitle: 'Structured content from library',
    description: 'Insert pre-approved, validated content components that maintain regulatory compliance across documents.',
    icon: <Layers className="w-6 h-6" />,
    benefits: [
      'Pre-approved, compliant content',
      'Consistent messaging across docs',
      'Automatic version tracking',
      'Reduces review cycles',
    ],
    bestFor: [
      'Standard boilerplate sections',
      'MOA descriptions',
      'Safety statements',
      'Statistical methodology',
    ],
    estimatedTime: 'Instant',
  },
  document: {
    mode: 'document',
    title: 'Author Document',
    subtitle: 'AI drafts entire document',
    description: 'Batch generate all or selected sections with intelligent dependency handling and progress tracking.',
    icon: <BookOpen className="w-6 h-6" />,
    benefits: [
      'Dramatically faster first draft',
      'Respects section dependencies',
      'Pause/resume capability',
      'Comprehensive audit trail',
    ],
    bestFor: [
      'New document creation',
      'Complete rewrites',
      'Time-sensitive deliverables',
    ],
    estimatedTime: '15-30 min for full doc',
  },
};

// ============================================================================
// DATA-CENTRIC POSITIONING BANNER
// ============================================================================

function DataCentricBanner() {
  const [isExpanded, setIsExpanded] = useState(false);
  
  return (
    <div className="mb-6 bg-gradient-to-r from-violet-500/10 via-blue-500/10 to-emerald-500/10 border border-violet-500/20 rounded-xl overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-violet-500/20 rounded-lg">
            <Database className="w-5 h-5 text-violet-400" />
          </div>
          <div className="text-left">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-200">Data-Centric Authoring</span>
              <span className="text-xs px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-full">Ready</span>
            </div>
            <p className="text-xs text-slate-400">
              Your content is structured data, not just documents
            </p>
          </div>
        </div>
        <ChevronRight className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
      </button>
      
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-violet-500/20 pt-4">
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="flex items-start gap-2">
              <GitBranch className="w-4 h-4 text-violet-400 mt-0.5" />
              <div>
                <div className="text-xs font-medium text-slate-300">Structured Content</div>
                <div className="text-xs text-slate-500">Modular, reusable components</div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Link2 className="w-4 h-4 text-blue-400 mt-0.5" />
              <div>
                <div className="text-xs font-medium text-slate-300">Source Lineage</div>
                <div className="text-xs text-slate-500">Full traceability to sources</div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Globe className="w-4 h-4 text-emerald-400 mt-0.5" />
              <div>
                <div className="text-xs font-medium text-slate-300">Multi-Format Ready</div>
                <div className="text-xs text-slate-500">PDF, FHIR, IDMP compatible</div>
              </div>
            </div>
          </div>
          
          <div className="p-3 bg-slate-900/50 rounded-lg">
            <p className="text-xs text-slate-400 leading-relaxed">
              Ligature implements <span className="text-violet-400 font-medium">Structured Content and Data Management (SCDM)</span> principles. 
              Every section you create is a data element—linked to sources, version-controlled, and ready for 
              multi-format output. This is the foundation for data-centric submissions as described by 
              <span className="text-blue-400"> Accumulus, FDA PQ/CMC, and EMA SPOR</span> initiatives.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// MODE CARD COMPONENT
// ============================================================================

function ModeCard({
  mode,
  title,
  subtitle,
  description,
  icon,
  benefits,
  bestFor,
  estimatedTime,
  dataPoints,
  isSelected,
  onSelect,
}: ModeCardProps) {
  const selectedSources = useAuthoringStore(s => s.selectedSourceIds);
  const availableSources = useAuthoringStore(s => s.availableSources);
  
  // Get relevant stats based on mode
  const stats = useMemo(() => {
    if (mode === 'reuse') {
      const approvedComponents = componentLibrary.filter(c => c.status === 'approved').length;
      return [
        { label: 'Approved Components', value: String(approvedComponents) },
        { label: 'Total Library', value: String(componentLibrary.length) },
      ];
    }
    if (mode === 'section' || mode === 'document') {
      return [
        { label: 'Sources Selected', value: `${selectedSources.size} of ${availableSources.length}` },
      ];
    }
    return dataPoints || [];
  }, [mode, selectedSources.size, availableSources.length, dataPoints]);

  const gradientColors = {
    section: 'from-violet-500/20 to-violet-600/10',
    reuse: 'from-emerald-500/20 to-emerald-600/10',
    document: 'from-blue-500/20 to-blue-600/10',
  };

  const iconColors = {
    section: 'bg-violet-500/20 text-violet-400',
    reuse: 'bg-emerald-500/20 text-emerald-400',
    document: 'bg-blue-500/20 text-blue-400',
  };

  const borderColors = {
    section: 'border-violet-500',
    reuse: 'border-emerald-500',
    document: 'border-blue-500',
  };

  return (
    <button
      onClick={onSelect}
      className={`
        relative text-left w-full p-5 rounded-xl border-2 transition-all duration-200
        ${isSelected 
          ? `bg-gradient-to-br ${gradientColors[mode]} ${borderColors[mode]} ring-2 ring-offset-2 ring-offset-slate-900 ring-${mode === 'section' ? 'violet' : mode === 'reuse' ? 'emerald' : 'blue'}-500/30`
          : 'bg-slate-800/50 border-slate-700 hover:border-slate-600 hover:bg-slate-800'
        }
      `}
    >
      {/* Selected indicator */}
      {isSelected && (
        <div className={`absolute top-3 right-3 w-6 h-6 rounded-full ${iconColors[mode]} flex items-center justify-center`}>
          <Check className="w-4 h-4" />
        </div>
      )}
      
      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        <div className={`p-2.5 rounded-lg ${iconColors[mode]}`}>
          {icon}
        </div>
        <div>
          <h3 className="text-lg font-semibold text-slate-100">{title}</h3>
          <p className="text-sm text-slate-400">{subtitle}</p>
        </div>
      </div>
      
      {/* Description */}
      <p className="text-sm text-slate-300 mb-4 leading-relaxed">
        {description}
      </p>
      
      {/* Stats */}
      {stats.length > 0 && (
        <div className="flex items-center gap-4 mb-4">
          {stats.map((stat, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <span className="text-xs text-slate-500">{stat.label}:</span>
              <span className="text-xs font-medium text-slate-300">{stat.value}</span>
            </div>
          ))}
        </div>
      )}
      
      {/* Benefits */}
      <div className="space-y-1.5 mb-4">
        {benefits.slice(0, 3).map((benefit, i) => (
          <div key={i} className="flex items-center gap-2 text-xs text-slate-400">
            <Check className="w-3 h-3 text-emerald-400 flex-shrink-0" />
            <span>{benefit}</span>
          </div>
        ))}
      </div>
      
      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-700/50">
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <Clock className="w-3 h-3" />
          <span>{estimatedTime}</span>
        </div>
        <div className={`text-xs font-medium ${isSelected ? 'text-white' : 'text-slate-400'} flex items-center gap-1`}>
          {isSelected ? 'Selected' : 'Select'} 
          <ArrowRight className="w-3 h-3" />
        </div>
      </div>
    </button>
  );
}

// ============================================================================
// QUICK STATS PANEL
// ============================================================================

function QuickStatsPanel({ document }: { document: AuthoringDocument }) {
  const sectionDrafts = useAuthoringStore(s => s.sectionDrafts);
  const selectedSources = useAuthoringStore(s => s.selectedSourceIds);
  
  const stats = useMemo(() => {
    const totalSections = document.sections?.length || 0;
    const completedSections = Object.values(sectionDrafts).filter(d => d.isAccepted).length;
    const approvedComponents = componentLibrary.filter(c => c.status === 'approved').length;
    
    return {
      totalSections,
      completedSections,
      remainingSections: totalSections - completedSections,
      sourcesSelected: selectedSources.size,
      approvedComponents,
    };
  }, [document, sectionDrafts, selectedSources]);

  return (
    <div className="grid grid-cols-4 gap-3 mb-6">
      <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
        <div className="text-xs text-slate-500 mb-1">Sections</div>
        <div className="text-lg font-semibold text-slate-200">{stats.totalSections}</div>
      </div>
      <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
        <div className="text-xs text-slate-500 mb-1">Completed</div>
        <div className="text-lg font-semibold text-emerald-400">{stats.completedSections}</div>
      </div>
      <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
        <div className="text-xs text-slate-500 mb-1">Sources</div>
        <div className="text-lg font-semibold text-blue-400">{stats.sourcesSelected}</div>
      </div>
      <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
        <div className="text-xs text-slate-500 mb-1">Components</div>
        <div className="text-lg font-semibold text-violet-400">{stats.approvedComponents}</div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function AIAuthoringModeSelector({
  document,
  currentSection,
  onModeSelected,
  onCancel,
}: AIAuthoringModeSelectorProps) {
  const [selectedMode, setSelectedMode] = useState<AuthoringMode | null>(null);
  
  const handleContinue = () => {
    if (selectedMode) {
      onModeSelected(selectedMode, {
        useSourceDocuments: true,
        skipCompleted: true,
      });
    }
  };

  return (
    <div className="min-h-[600px] bg-slate-900 rounded-xl p-6">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center gap-2 px-3 py-1.5 bg-violet-500/20 text-violet-400 rounded-full text-xs font-medium mb-3">
          <Sparkles className="w-3.5 h-3.5" />
          AI-Assisted Authoring
        </div>
        <h2 className="text-2xl font-bold text-slate-100 mb-2">
          How would you like to author?
        </h2>
        <p className="text-slate-400 max-w-xl mx-auto">
          Choose the authoring approach that best fits your needs. All content is tracked, 
          audited, and connected to your source documents.
        </p>
      </div>
      
      {/* Data-Centric Banner */}
      <DataCentricBanner />
      
      {/* Quick Stats */}
      <QuickStatsPanel document={document} />
      
      {/* Mode Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {(Object.entries(modeConfig) as [AuthoringMode, typeof modeConfig[AuthoringMode]][]).map(([mode, config]) => (
          <ModeCard
            key={mode}
            {...config}
            isSelected={selectedMode === mode}
            onSelect={() => setSelectedMode(mode)}
          />
        ))}
      </div>
      
      {/* Context-specific guidance */}
      {currentSection && selectedMode === 'section' && (
        <div className="mb-6 p-4 bg-violet-500/10 border border-violet-500/20 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-violet-400" />
            <span className="text-sm font-medium text-slate-200">Current Section</span>
          </div>
          <p className="text-sm text-slate-400">
            <span className="font-mono text-violet-400">{currentSection.number}</span> {currentSection.title}
            {' '}will be generated with AI assistance.
          </p>
        </div>
      )}
      
      {/* Best practices tip */}
      <div className="mb-6 p-4 bg-slate-800/50 border border-slate-700 rounded-lg">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
          <div>
            <div className="text-sm font-medium text-slate-200 mb-1">Recommended Workflow</div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Start with <span className="text-emerald-400 font-medium">Reuse Content</span> for standard sections, 
              then use <span className="text-blue-400 font-medium">Author Document</span> for the remaining sections. 
              Finally, use <span className="text-violet-400 font-medium">Author Section</span> for critical sections 
              that need careful attention.
            </p>
          </div>
        </div>
      </div>
      
      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-700">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm text-slate-400 hover:text-slate-300 transition-colors"
        >
          Cancel
        </button>
        
        <button
          onClick={handleContinue}
          disabled={!selectedMode}
          className={`
            flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all
            ${selectedMode
              ? 'bg-violet-600 text-white hover:bg-violet-500'
              : 'bg-slate-700 text-slate-500 cursor-not-allowed'
            }
          `}
        >
          Continue
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default AIAuthoringModeSelector;
