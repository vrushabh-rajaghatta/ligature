

import { useState } from 'react';
import {
  Database, GitBranch, Link2, Globe, Shield, Zap, 
  ChevronRight, ChevronDown, Check, ExternalLink,
  Layers, FileText, BarChart3, Clock, Target
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

interface DataCentricReadinessProps {
  variant?: 'banner' | 'card' | 'inline' | 'full';
  showMetrics?: boolean;
  collapsible?: boolean;
  defaultExpanded?: boolean;
  className?: string;
}

interface CapabilityItem {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  status: 'ready' | 'partial' | 'roadmap';
  alignment: string[];
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const capabilities: CapabilityItem[] = [
  {
    id: 'scdm',
    title: 'Structured Content & Data Management',
    description: 'Modular content components with full metadata, versioning, and reuse tracking',
    icon: <Layers className="w-4 h-4" />,
    status: 'ready',
    alignment: ['FDA PQ/CMC', 'SCDM Framework', 'dx-PQ'],
  },
  {
    id: 'lineage',
    title: 'Source Lineage & Traceability',
    description: 'Every content element linked to source documents with audit trail',
    icon: <GitBranch className="w-4 h-4" />,
    status: 'ready',
    alignment: ['21 CFR Part 11', 'ICH E6(R3)', 'GxP'],
  },
  {
    id: 'crossmodule',
    title: 'Cross-Module Data Flow',
    description: 'Clinical, safety, quality, and regulatory data connected in unified platform',
    icon: <Link2 className="w-4 h-4" />,
    status: 'ready',
    alignment: ['Enterprise Data Lake', 'R&D Connected'],
  },
  {
    id: 'multiformat',
    title: 'Multi-Format Output Ready',
    description: 'Foundation for PDF, eCTD, FHIR, and IDMP-compliant structured data exchange',
    icon: <Globe className="w-4 h-4" />,
    status: 'partial',
    alignment: ['HL7 FHIR', 'ISO IDMP', 'ICH eCTD'],
  },
  {
    id: 'masterdata',
    title: 'Master Data Management',
    description: 'Centralized substance, product, and organization referentials',
    icon: <Database className="w-4 h-4" />,
    status: 'ready',
    alignment: ['EMA SPOR', 'IDMP', 'DADI'],
  },
];

const statusColors = {
  ready: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', label: 'Ready' },
  partial: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Foundation' },
  roadmap: { bg: 'bg-amber-500/20', text: 'text-amber-400', label: 'Roadmap' },
};

// ============================================================================
// INLINE VARIANT
// ============================================================================

function InlineVariant({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 bg-violet-500/10 border border-violet-500/20 rounded-full ${className}`}>
      <Database className="w-3.5 h-3.5 text-violet-400" />
      <span className="text-xs font-medium text-violet-400">Data-Centric Ready</span>
      <span className="text-xs text-emerald-400">●</span>
    </div>
  );
}

// ============================================================================
// BANNER VARIANT
// ============================================================================

function BannerVariant({ collapsible = true, defaultExpanded = false, className = '' }: {
  collapsible?: boolean;
  defaultExpanded?: boolean;
  className?: string;
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  
  const readyCount = capabilities.filter(c => c.status === 'ready').length;
  
  return (
    <div className={`bg-gradient-to-r from-violet-500/10 via-blue-500/10 to-emerald-500/10 border border-violet-500/20 rounded-xl overflow-hidden ${className}`}>
      <button
        onClick={() => collapsible && setIsExpanded(!isExpanded)}
        className={`w-full p-4 flex items-center justify-between ${collapsible ? 'hover:bg-white/5 cursor-pointer' : ''} transition-colors`}
        disabled={!collapsible}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-violet-500/20 rounded-lg">
            <Database className="w-5 h-5 text-violet-400" />
          </div>
          <div className="text-left">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-200">Data-Centric Platform</span>
              <span className="text-xs px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-full">
                {readyCount}/{capabilities.length} Ready
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Built for structured content and data management
            </p>
          </div>
        </div>
        {collapsible && (
          <ChevronRight className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
        )}
      </button>
      
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-violet-500/20 pt-4">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
            {capabilities.slice(0, 3).map(cap => (
              <div key={cap.id} className="flex items-start gap-2">
                <span className={statusColors[cap.status]?.text}>{cap.icon}</span>
                <div>
                  <div className="text-xs font-medium text-slate-300">{cap.title}</div>
                  <div className="text-xs text-slate-500">{cap.description}</div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="p-3 bg-slate-900/50 rounded-lg">
            <p className="text-xs text-slate-400 leading-relaxed">
              Ligature implements <span className="text-violet-400 font-medium">Structured Content and Data Management</span> principles 
              aligned with <span className="text-blue-400">FDA PQ/CMC, EMA SPOR, and Accumulus</span> initiatives for data-centric regulatory submissions.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// CARD VARIANT
// ============================================================================

function CardVariant({ showMetrics = true, className = '' }: {
  showMetrics?: boolean;
  className?: string;
}) {
  return (
    <div className={`bg-slate-800 border border-slate-700 rounded-xl p-5 ${className}`}>
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2.5 bg-violet-500/20 rounded-lg">
          <Database className="w-6 h-6 text-violet-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-slate-100">Data-Centric Architecture</h3>
          <p className="text-sm text-slate-400">Built for the future of regulatory submissions</p>
        </div>
      </div>
      
      <div className="space-y-3 mb-4">
        {capabilities.map(cap => (
          <div key={cap.id} className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg">
            <div className="flex items-center gap-3">
              <span className={statusColors[cap.status]?.text}>{cap.icon}</span>
              <div>
                <div className="text-sm font-medium text-slate-200">{cap.title}</div>
                <div className="text-xs text-slate-500">{cap.description}</div>
              </div>
            </div>
            <span className={`text-xs px-2 py-1 rounded-full ${statusColors[cap.status]?.bg} ${statusColors[cap.status]?.text}`}>
              {statusColors[cap.status]?.label}
            </span>
          </div>
        ))}
      </div>
      
      {showMetrics && (
        <div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-700">
          <div className="text-center">
            <div className="text-2xl font-bold text-emerald-400">{capabilities.filter(c => c.status === 'ready').length}</div>
            <div className="text-xs text-slate-500">Capabilities Ready</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-400">5+</div>
            <div className="text-xs text-slate-500">Standard Alignments</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-violet-400">100%</div>
            <div className="text-xs text-slate-500">Audit Coverage</div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// FULL VARIANT (Investor/Strategy View)
// ============================================================================

function FullVariant({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-slate-900 rounded-xl p-6 ${className}`}>
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-violet-500/20 text-violet-400 rounded-full text-xs font-medium mb-3">
          <Database className="w-3.5 h-3.5" />
          Data-Centric Platform
        </div>
        <h2 className="text-2xl font-bold text-slate-100 mb-2">
          Ready for the Future of Regulatory Submissions
        </h2>
        <p className="text-slate-400 max-w-2xl mx-auto">
          Ligature is architecturally aligned with emerging data-centric submission standards 
          from FDA, EMA, and industry consortiums like Accumulus.
        </p>
      </div>
      
      {/* Three Journeys */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700">
          <div className="p-2 bg-violet-500/20 rounded-lg w-fit mb-3">
            <Link2 className="w-5 h-5 text-violet-400" />
          </div>
          <h3 className="text-sm font-semibold text-slate-200 mb-1">Siloed → Collaborative</h3>
          <p className="text-xs text-slate-400 mb-3">
            Cross-module data flow enables simultaneous multi-stakeholder access
          </p>
          <div className="flex items-center gap-1.5 text-xs text-emerald-400">
            <Check className="w-3 h-3" />
            <span>Implemented</span>
          </div>
        </div>
        
        <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700">
          <div className="p-2 bg-blue-500/20 rounded-lg w-fit mb-3">
            <Layers className="w-5 h-5 text-blue-400" />
          </div>
          <h3 className="text-sm font-semibold text-slate-200 mb-1">Documents → Data</h3>
          <p className="text-xs text-slate-400 mb-3">
            Structured content components replace static PDFs
          </p>
          <div className="flex items-center gap-1.5 text-xs text-emerald-400">
            <Check className="w-3 h-3" />
            <span>Implemented</span>
          </div>
        </div>
        
        <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700">
          <div className="p-2 bg-emerald-500/20 rounded-lg w-fit mb-3">
            <BarChart3 className="w-5 h-5 text-emerald-400" />
          </div>
          <h3 className="text-sm font-semibold text-slate-200 mb-1">Static → Learning</h3>
          <p className="text-xs text-slate-400 mb-3">
            AI-powered insights across unified data platform
          </p>
          <div className="flex items-center gap-1.5 text-xs text-emerald-400">
            <Check className="w-3 h-3" />
            <span>Implemented</span>
          </div>
        </div>
      </div>
      
      {/* Capability Matrix */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden mb-6">
        <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
          <span className="text-sm font-medium text-slate-200">Capability Alignment</span>
          <span className="text-xs text-emerald-400">
            {capabilities.filter(c => c.status === 'ready').length}/{capabilities.length} Production Ready
          </span>
        </div>
        <div className="divide-y divide-slate-700/50">
          {capabilities.map(cap => (
            <div key={cap.id} className="px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className={statusColors[cap.status]?.text}>{cap.icon}</span>
                <div>
                  <div className="text-sm text-slate-200">{cap.title}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    {cap.alignment.slice(0, 3).map((a, i) => (
                      <span key={i} className="text-xs px-1.5 py-0.5 bg-slate-700 rounded text-slate-400">{a}</span>
                    ))}
                  </div>
                </div>
              </div>
              <span className={`text-xs px-2.5 py-1 rounded-full ${statusColors[cap.status]?.bg} ${statusColors[cap.status]?.text}`}>
                {statusColors[cap.status]?.label}
              </span>
            </div>
          ))}
        </div>
      </div>
      
      {/* Industry Context */}
      <div className="p-4 bg-gradient-to-r from-violet-500/5 to-blue-500/5 border border-violet-500/20 rounded-lg">
        <div className="flex items-start gap-3">
          <Target className="w-5 h-5 text-violet-400 mt-0.5" />
          <div>
            <h4 className="text-sm font-medium text-slate-200 mb-2">Industry Momentum</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              In February 2025, Amgen submitted the first-ever digitally generated CMC dossier to 21 countries 
              simultaneously via Accumulus. Organizations using data-centric approaches report 
              <span className="text-emerald-400 font-medium"> up to 90% acceleration</span> in global approval timelines and 
              <span className="text-blue-400 font-medium"> $10M+ cost benefit</span> per major submission.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN EXPORT
// ============================================================================

export function DataCentricReadiness({
  variant = 'banner',
  showMetrics = true,
  collapsible = true,
  defaultExpanded = false,
  className = '',
}: DataCentricReadinessProps) {
  switch (variant) {
    case 'inline':
      return <InlineVariant className={className} />;
    case 'banner':
      return <BannerVariant collapsible={collapsible} defaultExpanded={defaultExpanded} className={className} />;
    case 'card':
      return <CardVariant showMetrics={showMetrics} className={className} />;
    case 'full':
      return <FullVariant className={className} />;
    default:
      return <BannerVariant collapsible={collapsible} defaultExpanded={defaultExpanded} className={className} />;
  }
}

// Also export individual variants for flexibility
export { InlineVariant as DataCentricInline };
export { BannerVariant as DataCentricBanner };
export { CardVariant as DataCentricCard };
export { FullVariant as DataCentricFull };

export default DataCentricReadiness;
