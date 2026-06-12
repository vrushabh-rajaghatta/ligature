/**
 * TemplateDiffViewer
 * Side-by-side comparison of template versions with change highlighting
 * 
 * v0.41.7 - Template Diff Viewer
 */


import React, { useState, useMemo } from 'react';
import {
  GitCompare,
  ChevronDown,
  ChevronRight,
  Plus,
  Minus,
  RefreshCw,
  Check,
  X,
  FileText,
  AlertCircle,
} from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

interface TemplateSection {
  id: string;
  sectionNumber: string;
  title: string;
  level: number;
  required: boolean;
  guidance: string | null;
  aiPrompt: string | null;
  wordCountMin: number | null;
  wordCountMax: number | null;
  templateContent: string | null;
  children?: TemplateSection[];
}

interface TemplateVersion {
  id: string;
  templateId: string;
  version: string;
  versionNumber: number;
  status: 'draft' | 'active' | 'deprecated' | 'archived';
  name: string;
  description: string | null;
  documentType: string;
  sections: TemplateSection[];
  changeSummary: string | null;
  changeReason: string | null;
  isApproved: boolean;
  approvedBy: string | null;
  approvedAt: string | null;
  createdBy: string;
  createdAt: string;
}

type DiffType = 'added' | 'removed' | 'modified' | 'unchanged';

interface SectionDiff {
  type: DiffType;
  leftSection: TemplateSection | null;
  rightSection: TemplateSection | null;
  fieldChanges?: {
    field: string;
    oldValue: unknown;
    newValue: unknown;
  }[];
}

interface TemplateDiffViewerProps {
  leftVersion: TemplateVersion | null;
  rightVersion: TemplateVersion | null;
  versions: TemplateVersion[];
  onSelectLeft: (version: TemplateVersion) => void;
  onSelectRight: (version: TemplateVersion) => void;
}

// =============================================================================
// DIFF LOGIC
// =============================================================================

function computeSectionDiffs(
  leftSections: TemplateSection[],
  rightSections: TemplateSection[]
): SectionDiff[] {
  const diffs: SectionDiff[] = [];
  const rightMap = new Map(rightSections.map(s => [s.id, s]));
  const leftMap = new Map(leftSections.map(s => [s.id, s]));
  
  // Find removed and modified
  for (const left of leftSections) {
    const right = rightMap.get(left.id);
    
    if (!right) {
      // Removed
      diffs.push({ type: 'removed', leftSection: left, rightSection: null });
    } else {
      // Check for modifications
      const changes = compareSection(left, right);
      if (changes.length > 0) {
        diffs.push({ 
          type: 'modified', 
          leftSection: left, 
          rightSection: right,
          fieldChanges: changes,
        });
      } else {
        diffs.push({ type: 'unchanged', leftSection: left, rightSection: right });
      }
    }
  }
  
  // Find added
  for (const right of rightSections) {
    if (!leftMap.has(right.id)) {
      diffs.push({ type: 'added', leftSection: null, rightSection: right });
    }
  }
  
  // Sort by section number
  diffs.sort((a, b) => {
    const aNum = a.leftSection?.sectionNumber || a.rightSection?.sectionNumber || '';
    const bNum = b.leftSection?.sectionNumber || b.rightSection?.sectionNumber || '';
    return aNum.localeCompare(bNum, undefined, { numeric: true });
  });
  
  return diffs;
}

function compareSection(left: TemplateSection, right: TemplateSection): { field: string; oldValue: unknown; newValue: unknown }[] {
  const changes: { field: string; oldValue: unknown; newValue: unknown }[] = [];
  
  const fields = ['title', 'sectionNumber', 'required', 'guidance', 'aiPrompt', 'wordCountMin', 'wordCountMax', 'templateContent'] as const;
  
  for (const field of fields) {
    if (left[field] !== right[field]) {
      changes.push({ field, oldValue: left[field], newValue: right[field] });
    }
  }
  
  return changes;
}

function getDiffStats(diffs: SectionDiff[]): { added: number; removed: number; modified: number; unchanged: number } {
  return {
    added: diffs.filter(d => d.type === 'added').length,
    removed: diffs.filter(d => d.type === 'removed').length,
    modified: diffs.filter(d => d.type === 'modified').length,
    unchanged: diffs.filter(d => d.type === 'unchanged').length,
  };
}

// =============================================================================
// COMPONENT
// =============================================================================

export default function TemplateDiffViewer({
  leftVersion,
  rightVersion,
  versions,
  onSelectLeft,
  onSelectRight,
}: TemplateDiffViewerProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [showUnchanged, setShowUnchanged] = useState(true);
  
  // Compute diffs
  const diffs = useMemo(() => {
    if (!leftVersion || !rightVersion) return [];
    return computeSectionDiffs(leftVersion.sections, rightVersion.sections);
  }, [leftVersion, rightVersion]);
  
  const stats = useMemo(() => getDiffStats(diffs), [diffs]);
  
  const toggleSection = (id: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };
  
  const filteredDiffs = showUnchanged 
    ? diffs 
    : diffs.filter(d => d.type !== 'unchanged');

  return (
    <div className="h-full flex flex-col bg-[#1a1f28]">
      {/* Header */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center gap-2 mb-4">
          <GitCompare className="w-5 h-5 text-blue-400" />
          <h2 className="text-lg font-semibold text-white">Compare Template Versions</h2>
        </div>
        
        {/* Version Selectors */}
        <div className="grid grid-cols-2 gap-4">
          {/* Left (Old) */}
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Base Version</label>
            <select
              value={leftVersion?.id || ''}
              onChange={(e) => {
                const v = versions.find(v => v.id === e.target.value);
                if (v) onSelectLeft(v);
              }}
              className="w-full bg-[#252d3a] border border-white/10 rounded-lg px-3 py-2 
                         text-white text-sm focus:outline-none focus:border-blue-500/50"
            >
              <option value="">Select version...</option>
              {versions.map(v => (
                <option key={v.id} value={v.id}>
                  v{v.version} ({v.status})
                </option>
              ))}
            </select>
          </div>
          
          {/* Right (New) */}
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Compare To</label>
            <select
              value={rightVersion?.id || ''}
              onChange={(e) => {
                const v = versions.find(v => v.id === e.target.value);
                if (v) onSelectRight(v);
              }}
              className="w-full bg-[#252d3a] border border-white/10 rounded-lg px-3 py-2 
                         text-white text-sm focus:outline-none focus:border-blue-500/50"
            >
              <option value="">Select version...</option>
              {versions.map(v => (
                <option key={v.id} value={v.id}>
                  v{v.version} ({v.status})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
      
      {/* Stats Bar */}
      {leftVersion && rightVersion && (
        <div className="px-4 py-3 border-b border-white/10 flex items-center gap-4">
          <div className="flex items-center gap-4 flex-1">
            <span className="flex items-center gap-1.5 text-sm">
              <Plus className="w-4 h-4 text-emerald-400" />
              <span className="text-emerald-400">{stats.added} added</span>
            </span>
            <span className="flex items-center gap-1.5 text-sm">
              <Minus className="w-4 h-4 text-red-400" />
              <span className="text-red-400">{stats.removed} removed</span>
            </span>
            <span className="flex items-center gap-1.5 text-sm">
              <RefreshCw className="w-4 h-4 text-amber-400" />
              <span className="text-amber-400">{stats.modified} modified</span>
            </span>
            <span className="text-sm text-gray-500">
              {stats.unchanged} unchanged
            </span>
          </div>
          
          <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
            <input
              type="checkbox"
              checked={showUnchanged}
              onChange={(e) => setShowUnchanged(e.target.checked)}
              className="rounded border-white/20 bg-[#252d3a] text-blue-500"
            />
            Show unchanged
          </label>
        </div>
      )}
      
      {/* Diff Content */}
      <div className="flex-1 overflow-auto">
        {!leftVersion || !rightVersion ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <FileText className="w-12 h-12 mb-3 opacity-50" />
            <p>Select two versions to compare</p>
          </div>
        ) : filteredDiffs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <Check className="w-12 h-12 mb-3 text-emerald-400" />
            <p>No differences found</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {filteredDiffs.map((diff, idx) => (
              <DiffRow
                key={idx}
                diff={diff}
                isExpanded={expandedSections.has(diff.leftSection?.id || diff.rightSection?.id || '')}
                onToggle={() => toggleSection(diff.leftSection?.id || diff.rightSection?.id || '')}
              />
            ))}
          </div>
        )}
      </div>
      
      {/* Change Summary */}
      {rightVersion?.changeSummary && (
        <div className="p-4 border-t border-white/10 bg-[#252d3a]">
          <div className="text-xs text-gray-500 mb-1">Change Summary (v{rightVersion.version})</div>
          <p className="text-sm text-gray-300">{rightVersion.changeSummary}</p>
          {rightVersion.changeReason && (
            <div className="text-xs text-gray-500 mt-1">
              Reason: {rightVersion.changeReason}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// DIFF ROW COMPONENT
// =============================================================================

function DiffRow({
  diff,
  isExpanded,
  onToggle,
}: {
  diff: SectionDiff;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const section = diff.rightSection || diff.leftSection;
  if (!section) return null;
  
  const bgColor = {
    added: 'bg-emerald-500/5 hover:bg-emerald-500/10',
    removed: 'bg-red-500/5 hover:bg-red-500/10',
    modified: 'bg-amber-500/5 hover:bg-amber-500/10',
    unchanged: 'hover:bg-white/5',
  }[diff.type];
  
  const borderColor = {
    added: 'border-l-emerald-500',
    removed: 'border-l-red-500',
    modified: 'border-l-amber-500',
    unchanged: 'border-l-transparent',
  }[diff.type];
  
  const icon = {
    added: <Plus className="w-4 h-4 text-emerald-400" />,
    removed: <Minus className="w-4 h-4 text-red-400" />,
    modified: <RefreshCw className="w-4 h-4 text-amber-400" />,
    unchanged: null,
  }[diff.type];

  return (
    <div className={`border-l-2 ${borderColor}`}>
      <button
        onClick={onToggle}
        className={`w-full px-4 py-3 flex items-center gap-3 ${bgColor} transition-colors`}
      >
        {/* Expand icon */}
        {diff.type === 'modified' ? (
          isExpanded ? (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-400" />
          )
        ) : (
          <span className="w-4" />
        )}
        
        {/* Type indicator */}
        {icon}
        
        {/* Section info */}
        <div className="flex-1 text-left">
          <span className="text-white font-medium">
            {section.sectionNumber} {section.title}
          </span>
          {section.required && (
            <span className="ml-2 px-1.5 py-0.5 text-xs bg-red-500/20 text-red-400 rounded">
              Required
            </span>
          )}
        </div>
        
        {/* Change count for modified */}
        {diff.type === 'modified' && diff.fieldChanges && (
          <span className="text-xs text-amber-400">
            {diff.fieldChanges.length} change{diff.fieldChanges.length !== 1 ? 's' : ''}
          </span>
        )}
      </button>
      
      {/* Expanded details for modified sections */}
      {isExpanded && diff.type === 'modified' && diff.fieldChanges && (
        <div className="px-4 pb-3 space-y-2 bg-[#252d3a]/50">
          {diff.fieldChanges.map((change, idx) => (
            <div key={idx} className="flex items-start gap-4 text-sm">
              <span className="w-32 text-gray-500 shrink-0 capitalize">
                {change.field.replace(/([A-Z])/g, ' $1').trim()}
              </span>
              <div className="flex-1 grid grid-cols-2 gap-4">
                <div className="px-2 py-1 bg-red-500/10 rounded border border-red-500/20">
                  <span className="text-red-300">
                    {formatValue(change.oldValue)}
                  </span>
                </div>
                <div className="px-2 py-1 bg-emerald-500/10 rounded border border-emerald-500/20">
                  <span className="text-emerald-300">
                    {formatValue(change.newValue)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '(empty)';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'string' && value.length > 100) {
    return value.slice(0, 100) + '...';
  }
  return String(value);
}
