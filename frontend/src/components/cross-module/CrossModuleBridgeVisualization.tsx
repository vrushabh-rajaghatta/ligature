// =============================================================================
// CROSS-MODULE BRIDGE VISUALIZATION — v0.42.51
// =============================================================================
// Visual display of real-time data flows between platform modules.
// Shows how Stability, Biostats, and SPL/Labeling data automatically
// flows into eCTD submission sections — the "R&D Connected" pitch.
//
// Designed for investor demos: animated flows, live metrics, interactive detail.
// =============================================================================


import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ArrowRight, Activity, Database, FileText, Check, AlertTriangle,
  Clock, Zap, FlaskConical, BarChart3, BookOpen, ChevronDown, ChevronUp,
  Shield, Package, Beaker, RefreshCw, GitBranch, Layers,
} from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

// Import bridge data
import {
  ECTD_STABILITY_MAPPINGS,
  type StabilityECTDMapping,
} from '@/lib/stability-submissions-bridge';
import {
  ECTD_MODULE5_MAPPINGS,
  type ECTDMapping,
} from '@/lib/biostats-submissions-bridge';
import {
  SECTION_MAPPINGS,
  type SectionMapping,
} from '@/lib/spl-labeling-bridge';

// =============================================================================
// TYPES
// =============================================================================

interface BridgeDefinition {
  id: string;
  name: string;
  description: string;
  sourceModule: string;
  sourceIcon: React.ReactNode;
  targetModule: string;
  targetIcon: React.ReactNode;
  bridgeLabel: string;
  color: string;       // Tailwind color class
  accentColor: string; // For the flow animation
  metrics: BridgeMetric[];
  mappings: MappingItem[];
}

interface BridgeMetric {
  label: string;
  value: number | string;
  suffix?: string;
  trend?: 'up' | 'down' | 'stable';
}

interface MappingItem {
  source: string;
  target: string;
  priority: string;
  guideline?: string;
}

// =============================================================================
// BRIDGE DEFINITIONS (sourced from real bridge modules)
// =============================================================================

function buildBridgeDefinitions(): BridgeDefinition[] {
  // --- Stability → 3.2.P.8 ---
  const stabilityMappings: MappingItem[] = ECTD_STABILITY_MAPPINGS.map((m: StabilityECTDMapping) => ({
    source: m.studyType.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    target: `${m.ectdModule} — ${m.ectdTitle}`,
    priority: m.priority,
    guideline: m.ichGuideline,
  }));

  const stabilityRequired = ECTD_STABILITY_MAPPINGS.filter(m => m.priority === 'required').length;
  const stabilitySupporting = ECTD_STABILITY_MAPPINGS.filter(m => m.priority === 'supporting').length;

  // --- Biostats → Module 5 ---
  const biostatsMappings: MappingItem[] = ECTD_MODULE5_MAPPINGS.map((m: ECTDMapping) => ({
    source: `${m.tlfType.charAt(0).toUpperCase() + m.tlfType.slice(1)} (${m.population})`,
    target: `${m.ectdModule} — ${m.ectdTitle}`,
    priority: m.priority,
  }));

  const biostatsCritical = ECTD_MODULE5_MAPPINGS.filter(m => m.priority === 'critical').length;
  const biostatsTargets = new Set(ECTD_MODULE5_MAPPINGS.map(m => m.ectdModule)).size;

  // --- SPL ↔ Labeling ---
  const splMappings: MappingItem[] = SECTION_MAPPINGS.map((m: SectionMapping) => ({
    source: `USPI §${m.uspiSection} — ${m.uspiTitle}`,
    target: `SPL: ${m.splCode}`,
    priority: m.category,
    guideline: 'FDA PLR',
  }));

  return [
    {
      id: 'stability-submissions',
      name: 'Stability → eCTD 3.2.P.8',
      description: 'ICH Q1 stability data automatically mapped to eCTD Quality sections',
      sourceModule: 'Stability Studies',
      sourceIcon: <FlaskConical className="w-5 h-5" />,
      targetModule: 'Module 3 Quality',
      targetIcon: <Package className="w-5 h-5" />,
      bridgeLabel: 'ICH Q1 → M4Q',
      color: 'emerald',
      accentColor: '#10b981',
      metrics: [
        { label: 'Study Types Mapped', value: ECTD_STABILITY_MAPPINGS.length },
        { label: 'Required', value: stabilityRequired },
        { label: 'Supporting', value: stabilitySupporting },
        { label: 'Target Section', value: '3.2.P.8' },
      ],
      mappings: stabilityMappings,
    },
    {
      id: 'biostats-submissions',
      name: 'Biostats TLFs → eCTD Module 5',
      description: 'QC-passed tables, listings, and figures flow to Clinical Study Reports',
      sourceModule: 'Biostatistics',
      sourceIcon: <BarChart3 className="w-5 h-5" />,
      targetModule: 'Module 5 Clinical',
      targetIcon: <FileText className="w-5 h-5" />,
      bridgeLabel: 'TLF QC → CSR',
      color: 'blue',
      accentColor: '#3b82f6',
      metrics: [
        { label: 'TLF Mappings', value: ECTD_MODULE5_MAPPINGS.length },
        { label: 'Critical', value: biostatsCritical },
        { label: 'Target Sections', value: biostatsTargets },
        { label: 'Populations', value: '6' },
      ],
      mappings: biostatsMappings,
    },
    {
      id: 'spl-labeling',
      name: 'SPL ↔ Labeling',
      description: 'Bidirectional sync between FDA SPL codes and USPI sections per PLR',
      sourceModule: 'US Labeling (USPI)',
      sourceIcon: <BookOpen className="w-5 h-5" />,
      targetModule: 'SPL (Structured)',
      targetIcon: <Database className="w-5 h-5" />,
      bridgeLabel: 'PLR Mapping',
      color: 'violet',
      accentColor: '#8b5cf6',
      metrics: [
        { label: 'Section Mappings', value: SECTION_MAPPINGS.length },
        { label: 'Bidirectional', value: 'Yes' },
        { label: 'Full PI Sections', value: SECTION_MAPPINGS.filter(m => m.category === 'full-pi').length },
        { label: 'Standard', value: 'FDA PLR' },
      ],
      mappings: splMappings,
    },
  ];
}

// =============================================================================
// ANIMATED FLOW DOT
// =============================================================================

function FlowDot({ color, delay = 0 }: { color: string; delay?: number }) {
  return (
    <div
      className="absolute w-2 h-2 rounded-full opacity-80"
      style={{
        backgroundColor: color,
        animation: `flowPulse 2.5s ease-in-out ${delay}s infinite`,
        boxShadow: `0 0 6px ${color}40`,
      }}
    />
  );
}

// =============================================================================
// FLOW CONNECTOR (animated line between source → target)
// =============================================================================

function FlowConnector({ color, bidirectional = false }: { color: string; bidirectional?: boolean }) {
  return (
    <div className="relative flex items-center justify-center w-full px-2">
      {/* Line */}
      <div className="h-[2px] w-full rounded-full bg-gray-200 dark:bg-gray-700 relative overflow-hidden">
        {/* Animated gradient pulse */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: `linear-gradient(90deg, transparent 0%, ${color}60 40%, ${color} 50%, ${color}60 60%, transparent 100%)`,
            animation: 'flowSlide 2s ease-in-out infinite',
          }}
        />
      </div>
      {/* Arrow */}
      <div className="absolute right-0">
        <ArrowRight className="w-4 h-4 text-gray-400" />
      </div>
      {bidirectional && (
        <div className="absolute left-0 rotate-180">
          <ArrowRight className="w-4 h-4 text-gray-400" />
        </div>
      )}
    </div>
  );
}

// =============================================================================
// BRIDGE CARD
// =============================================================================

function BridgeCard({ bridge, isExpanded, onToggle }: {
  bridge: BridgeDefinition;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const colorMap: Record<string, { bg: string; border: string; text: string; badge: string; lightBg: string }> = {
    emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', badge: 'bg-emerald-100 text-emerald-800', lightBg: 'bg-emerald-500/10' },
    blue: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', badge: 'bg-blue-100 text-blue-800', lightBg: 'bg-blue-500/10' },
    violet: { bg: 'bg-violet-50', border: 'border-violet-200', text: 'text-violet-700', badge: 'bg-violet-100 text-violet-800', lightBg: 'bg-violet-500/10' },
  };

  const c = colorMap[bridge.color] || colorMap.blue;

  return (
    <div className={`rounded-lg border ${c?.border ?? ''} ${c?.bg ?? ''} overflow-hidden transition-all duration-300`}>
      {/* Header Row: Source → Bridge → Target */}
      <div className="p-4">
        <div className="flex items-center gap-3 mb-3">
          {/* Source Module */}
          <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-gray-200 shadow-sm min-w-[140px]">
            <div className={`p-1.5 rounded ${c.lightBg} ${c?.text ?? ''}`}>
              {bridge.sourceIcon}
            </div>
            <div>
              <div className="text-xs text-gray-500 leading-none">Source</div>
              <div className="text-sm font-medium text-gray-900 leading-tight">{bridge.sourceModule}</div>
            </div>
          </div>

          {/* Flow Connector */}
          <div className="flex-1 min-w-[60px]">
            <FlowConnector color={bridge.accentColor} bidirectional={bridge.id === 'spl-labeling'} />
          </div>

          {/* Bridge Label */}
          <div className={`px-3 py-1.5 rounded-full text-xs font-semibold ${c.badge} whitespace-nowrap`}>
            <GitBranch className="w-3 h-3 inline mr-1" />
            {bridge.bridgeLabel}
          </div>

          {/* Flow Connector */}
          <div className="flex-1 min-w-[60px]">
            <FlowConnector color={bridge.accentColor} bidirectional={bridge.id === 'spl-labeling'} />
          </div>

          {/* Target Module */}
          <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-gray-200 shadow-sm min-w-[140px]">
            <div className={`p-1.5 rounded ${c.lightBg} ${c?.text ?? ''}`}>
              {bridge.targetIcon}
            </div>
            <div>
              <div className="text-xs text-gray-500 leading-none">Target</div>
              <div className="text-sm font-medium text-gray-900 leading-tight">{bridge.targetModule}</div>
            </div>
          </div>
        </div>

        {/* Metrics Row */}
        <div className="flex items-center gap-4 mb-2">
          {bridge.metrics.map((metric, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <span className="text-xs text-gray-500">{metric.label}:</span>
              <span className={`text-xs font-semibold ${c?.text ?? ''}`}>
                {metric.value}{metric.suffix || ''}
              </span>
            </div>
          ))}
        </div>

        {/* Description + Expand */}
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-600">{bridge.description}</p>
          <button
            onClick={onToggle}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors ml-4 shrink-0"
          >
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {isExpanded ? 'Collapse' : `${bridge.mappings.length} mappings`}
          </button>
        </div>
      </div>

      {/* Expanded: Mapping Table */}
      {isExpanded && (
        <div className="border-t border-gray-200/60 bg-white/60 px-4 py-3">
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
            Data Flow Mappings ({bridge.mappings.length})
          </div>
          <div className="max-h-64 overflow-y-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-100">
                  <th className="pb-1.5 pr-3 font-medium">Source</th>
                  <th className="pb-1.5 pr-3 font-medium">Target eCTD Section</th>
                  <th className="pb-1.5 pr-3 font-medium">Priority</th>
                  {bridge.mappings.some(m => m.guideline) && (
                    <th className="pb-1.5 font-medium">Guideline</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {bridge.mappings.map((mapping, i) => (
                  <tr key={i} className="border-b border-gray-50 last:border-0">
                    <td className="py-1.5 pr-3 text-gray-700">{mapping.source}</td>
                    <td className="py-1.5 pr-3 text-gray-600 font-mono">{mapping.target}</td>
                    <td className="py-1.5 pr-3">
                      <PriorityBadge priority={mapping.priority} />
                    </td>
                    {bridge.mappings.some(m => m.guideline) && (
                      <td className="py-1.5 text-gray-500">{mapping.guideline || '—'}</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// PRIORITY BADGE
// =============================================================================

function PriorityBadge({ priority }: { priority: string }) {
  const styles: Record<string, string> = {
    required: 'bg-red-100 text-red-700',
    critical: 'bg-red-100 text-red-700',
    supporting: 'bg-amber-100 text-amber-700',
    optional: 'bg-gray-100 text-gray-600',
    appendix: 'bg-gray-100 text-gray-600',
    'full-pi': 'bg-blue-100 text-blue-700',
    highlights: 'bg-emerald-100 text-emerald-700',
    'patient-info': 'bg-violet-100 text-violet-700',
  };

  return (
    <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium ${styles[priority] || 'bg-gray-100 text-gray-600'}`}>
      {priority}
    </span>
  );
}

// =============================================================================
// AGGREGATE STATS BANNER
// =============================================================================

function AggregateBanner({ bridges }: { bridges: BridgeDefinition[] }) {
  const totalMappings = bridges.reduce((sum, b) => sum + b.mappings.length, 0);
  const totalBridges = bridges.length;
  const guidelines = new Set<string>();
  bridges.forEach(b => b.mappings.forEach(m => { if (m.guideline) guidelines.add(m.guideline); }));

  return (
    <div className="flex items-center gap-6 px-4 py-3 bg-gray-50 rounded-lg border border-gray-200 mb-4">
      <div className="flex items-center gap-2">
        <div className="p-2 bg-indigo-100 rounded-lg">
          <Layers className="w-4 h-4 text-indigo-600" />
        </div>
        <div>
          <div className="text-lg font-bold text-gray-900">{totalBridges}</div>
          <div className="text-xs text-gray-500">Active Bridges</div>
        </div>
      </div>
      <div className="w-px h-8 bg-gray-200" />
      <div>
        <div className="text-lg font-bold text-gray-900">{totalMappings}</div>
        <div className="text-xs text-gray-500">Data Mappings</div>
      </div>
      <div className="w-px h-8 bg-gray-200" />
      <div>
        <div className="text-lg font-bold text-gray-900">{guidelines.size}</div>
        <div className="text-xs text-gray-500">ICH/FDA Guidelines</div>
      </div>
      <div className="w-px h-8 bg-gray-200" />
      <div className="flex items-center gap-1.5">
        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <span className="text-sm font-medium text-emerald-700">Live — Zero Manual Handoffs</span>
      </div>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function CrossModuleBridgeVisualization() {
  const [expandedBridge, setExpandedBridge] = useState<string | null>(null);
  const bridges = useMemo(() => buildBridgeDefinitions(), []);

  const handleToggle = useCallback((bridgeId: string) => {
    setExpandedBridge(prev => prev === bridgeId ? null : bridgeId);
  }, []);

  return (
    <div className="space-y-3">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-indigo-100 rounded-lg">
            <Activity className="w-4 h-4 text-indigo-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Cross-Module Data Flow</h3>
            <p className="text-xs text-gray-500">Automated bridges eliminating manual data transfer</p>
          </div>
        </div>
        <Badge variant="outline" className="text-xs">
          <Zap className="w-3 h-3 mr-1 text-amber-500" />
          R&D Connected
        </Badge>
      </div>

      {/* Aggregate Stats */}
      <AggregateBanner bridges={bridges} />

      {/* Bridge Cards */}
      <div className="space-y-3">
        {bridges.map(bridge => (
          <BridgeCard
            key={bridge.id}
            bridge={bridge}
            isExpanded={expandedBridge === bridge.id}
            onToggle={() => handleToggle(bridge.id)}
          />
        ))}
      </div>

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes flowSlide {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
        @keyframes flowPulse {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
}

export default CrossModuleBridgeVisualization;
