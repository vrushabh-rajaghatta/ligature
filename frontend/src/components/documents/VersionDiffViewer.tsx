
// VersionDiffViewer Component - v0.13.44 (Phase 2.3d)
// Side-by-side and unified version comparison with regulatory-grade change tracking


import { useState, useMemo, useCallback } from 'react';
import {
  ArrowLeftRight, ChevronDown, ChevronRight, X, Download,
  Plus, Minus, Edit, Eye, CheckCircle, FileText, Clock, User,
  Columns, AlignJustify, Filter, ZoomIn, ZoomOut, Copy, Printer
} from 'lucide-react';
import { Badge, BadgeColor } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import type { EnterpriseDocument, DocumentVersionRef } from '@/domains/document-control/contracts';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export type DiffViewMode = 'unified' | 'split';
export type DiffLineType = 'unchanged' | 'added' | 'removed' | 'modified';
export type SectionChangeType = 'added' | 'removed' | 'modified' | 'unchanged';

export interface DiffLine {
  id: string;
  lineNumber: { from?: number; to?: number };
  type: DiffLineType;
  content: string;
  previousContent?: string;
}

export interface DiffSection {
  id: string;
  sectionNumber: string;
  sectionTitle: string;
  changeType: SectionChangeType;
  lines: DiffLine[];
  addedLines: number;
  removedLines: number;
  modifiedLines: number;
}

export interface VersionDiff {
  id: string;
  fromVersion: string;
  toVersion: string;
  fromVersionId: string;
  toVersionId: string;
  generatedAt: string;
  sections: DiffSection[];
  summary: DiffSummary;
}

export interface DiffSummary {
  totalSections: number;
  addedSections: number;
  removedSections: number;
  modifiedSections: number;
  unchangedSections: number;
  addedWords: number;
  removedWords: number;
  addedLines: number;
  removedLines: number;
  modifiedLines: number;
  netChange: number;
  changePercentage: number;
}

export interface VersionDiffViewerProps {
  document: EnterpriseDocument;
  fromVersionId: string;
  toVersionId: string;
  onClose: () => void;
  onSwapVersions?: () => void;
  onExportDiff?: (format: 'pdf' | 'html' | 'json') => void;
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

// Simple word-level diff algorithm
export function computeWordDiff(oldText: string, newText: string): { added: string[]; removed: string[]; unchanged: string[] } {
  const oldWords = oldText.split(/\s+/).filter(w => w.length > 0);
  const newWords = newText.split(/\s+/).filter(w => w.length > 0);
  
  const added: string[] = [];
  const removed: string[] = [];
  const unchanged: string[] = [];
  
  const oldSet = new Set(oldWords);
  const newSet = new Set(newWords);
  
  oldWords.forEach(word => {
    if (!newSet.has(word)) {
      removed.push(word);
    } else {
      unchanged.push(word);
    }
  });
  
  newWords.forEach(word => {
    if (!oldSet.has(word)) {
      added.push(word);
    }
  });
  
  return { added, removed, unchanged };
}

// Generate mock diff data for demonstration
export function generateMockDiff(
  document: EnterpriseDocument,
  fromVersionId: string,
  toVersionId: string
): VersionDiff {
  const fromVersion = document.versionHistory.find(v => v.versionId === fromVersionId);
  const toVersion = toVersionId === 'current' 
    ? { version: document.version, versionId: 'current' } 
    : document.versionHistory.find(v => v.versionId === toVersionId);
  
  // Generate realistic diff sections based on document type
  const sections = generateDiffSections(document.title);
  
  const summary = calculateDiffSummary(sections);
  
  return {
    id: `diff-${fromVersionId}-${toVersionId}`,
    fromVersion: fromVersion?.version || '1.0',
    toVersion: toVersion?.version || document.version,
    fromVersionId,
    toVersionId,
    generatedAt: new Date().toISOString(),
    sections,
    summary,
  };
}

function generateDiffSections(documentTitle: string): DiffSection[] {
  const title = documentTitle.toLowerCase();
  
  // Investigator's Brochure sections
  if (title.includes('investigator') || title.includes('brochure')) {
    return [
      createDiffSection('1', 'Summary', 'modified', [
        { type: 'unchanged', content: 'This Investigator\'s Brochure (IB) provides comprehensive information about LIG-2847.' },
        { type: 'removed', content: 'The compound is in early development stages.' },
        { type: 'added', content: 'The compound has demonstrated efficacy in Phase 2b clinical trials.' },
        { type: 'added', content: 'Phase 3 studies are currently ongoing.' },
      ]),
      createDiffSection('3.2', 'Drug Product', 'modified', [
        { type: 'unchanged', content: 'LIG-2847 is formulated as immediate-release tablets.' },
        { type: 'modified', content: 'Available strengths: 50 mg and 100 mg tablets.' },
        { type: 'added', content: 'A new 25 mg dose strength has been added for dose titration.' },
      ]),
      createDiffSection('5.2', 'Efficacy', 'modified', [
        { type: 'removed', content: 'Phase 2a data showed preliminary efficacy signals.' },
        { type: 'added', content: 'Phase 2b study (n=420) demonstrated ACR20 response rates of 62% (50mg BID) and 71% (100mg BID) vs 28% placebo at Week 12 (p<0.001).' },
        { type: 'added', content: 'ACR50 response: 41% (100mg BID) vs 12% placebo.' },
        { type: 'added', content: 'ACR70 response: 19% (100mg BID) vs 4% placebo.' },
      ]),
      createDiffSection('5.3', 'Safety', 'modified', [
        { type: 'unchanged', content: 'Most common adverse events include upper respiratory tract infection and nasopharyngitis.' },
        { type: 'added', content: 'Updated safety database includes 1,247 subjects with >800 patient-years of exposure.' },
        { type: 'added', content: 'No new safety signals identified in Phase 2b pooled analysis.' },
      ]),
      createDiffSection('6', 'Summary of Data and Guidance', 'unchanged', [
        { type: 'unchanged', content: 'LIG-2847 has demonstrated favorable safety and efficacy profiles.' },
        { type: 'unchanged', content: 'Starting dose recommendation: 100 mg BID.' },
      ]),
    ];
  }
  
  // Clinical Study Report sections
  if (title.includes('clinical study report') || title.includes('csr')) {
    return [
      createDiffSection('1', 'Synopsis', 'unchanged', [
        { type: 'unchanged', content: 'A Phase 3, randomized, double-blind, placebo-controlled study.' },
      ]),
      createDiffSection('5.2', 'Efficacy Results', 'modified', [
        { type: 'unchanged', content: 'Primary endpoint: ACR20 at Week 12.' },
        { type: 'removed', content: 'Preliminary results pending final data lock.' },
        { type: 'added', content: 'Final results: 67.2% (100mg BID) vs 25.5% placebo (p<0.0001).' },
        { type: 'added', content: 'All secondary endpoints met statistical significance.' },
      ]),
      createDiffSection('5.3', 'Safety Results', 'modified', [
        { type: 'modified', content: 'Treatment-emergent adverse events: 58% treatment vs 42% placebo.' },
        { type: 'added', content: 'Serious adverse events: 4.2% vs 3.8% (not statistically different).' },
      ]),
      createDiffSection('7', 'Conclusions', 'modified', [
        { type: 'removed', content: 'Preliminary conclusions pending final analysis.' },
        { type: 'added', content: 'LIG-2847 100mg BID is effective and well-tolerated for moderate-to-severe RA.' },
        { type: 'added', content: 'Results support regulatory submission.' },
      ]),
    ];
  }
  
  // Default sections for other document types
  return [
    createDiffSection('1', 'Introduction', 'modified', [
      { type: 'unchanged', content: 'This document describes the regulatory requirements.' },
      { type: 'added', content: 'Updated to reflect current regulatory guidance.' },
    ]),
    createDiffSection('2', 'Scope', 'unchanged', [
      { type: 'unchanged', content: 'This document applies to all clinical development activities.' },
    ]),
    createDiffSection('3', 'Requirements', 'modified', [
      { type: 'modified', content: 'All submissions must comply with ICH E6(R3) guidelines.' },
      { type: 'added', content: 'Electronic submissions are now required for all modules.' },
    ]),
    createDiffSection('4', 'References', 'added', [
      { type: 'added', content: 'ICH E6(R3) - Good Clinical Practice' },
      { type: 'added', content: 'FDA Guidance for Industry: Electronic Submissions' },
    ]),
  ];
}

function createDiffSection(
  sectionNumber: string,
  sectionTitle: string,
  changeType: SectionChangeType,
  lineData: { type: DiffLineType; content: string }[]
): DiffSection {
  let fromLineNum = 1;
  let toLineNum = 1;
  
  const lines: DiffLine[] = lineData.map((data, idx) => {
    const lineNum: { from?: number; to?: number } = {};
    
    if (data.type === 'unchanged' || data.type === 'modified') {
      lineNum.from = fromLineNum++;
      lineNum.to = toLineNum++;
    } else if (data.type === 'removed') {
      lineNum.from = fromLineNum++;
    } else if (data.type === 'added') {
      lineNum.to = toLineNum++;
    }
    
    return {
      id: `line-${sectionNumber}-${idx}`,
      lineNumber: lineNum,
      type: data.type,
      content: data.content,
    };
  });
  
  const addedLines = lines.filter(l => l.type === 'added').length;
  const removedLines = lines.filter(l => l.type === 'removed').length;
  const modifiedLines = lines.filter(l => l.type === 'modified').length;
  
  return {
    id: `section-${sectionNumber}`,
    sectionNumber,
    sectionTitle,
    changeType,
    lines,
    addedLines,
    removedLines,
    modifiedLines,
  };
}

export function calculateDiffSummary(sections: DiffSection[]): DiffSummary {
  const addedSections = sections.filter(s => s.changeType === 'added').length;
  const removedSections = sections.filter(s => s.changeType === 'removed').length;
  const modifiedSections = sections.filter(s => s.changeType === 'modified').length;
  const unchangedSections = sections.filter(s => s.changeType === 'unchanged').length;
  
  let addedLines = 0;
  let removedLines = 0;
  let modifiedLines = 0;
  
  sections.forEach(section => {
    addedLines += section.addedLines;
    removedLines += section.removedLines;
    modifiedLines += section.modifiedLines;
  });
  
  // Estimate word changes (rough approximation)
  const addedWords = addedLines * 15; // Average 15 words per line
  const removedWords = removedLines * 15;
  
  const totalChangedLines = addedLines + removedLines + modifiedLines;
  const totalLines = sections.reduce((sum, s) => sum + s.lines.length, 0);
  const changePercentage = totalLines > 0 ? Math.round((totalChangedLines / totalLines) * 100) : 0;
  
  return {
    totalSections: sections.length,
    addedSections,
    removedSections,
    modifiedSections,
    unchangedSections,
    addedWords,
    removedWords,
    addedLines,
    removedLines,
    modifiedLines,
    netChange: addedLines - removedLines,
    changePercentage,
  };
}

// Format helpers
export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatTime(dateString: string): string {
  return new Date(dateString).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

// =============================================================================
// COLOR MAPS
// =============================================================================

const lineTypeColorMap: Record<DiffLineType, { bg: string; text: string; border: string }> = {
  unchanged: { bg: 'bg-surface', text: 'text-text-secondary', border: 'border-transparent' },
  added: { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500' },
  removed: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500' },
  modified: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500' },
};

const sectionChangeColorMap: Record<SectionChangeType, { bg: string; border: string; icon: string }> = {
  unchanged: { bg: 'bg-surface-card', border: 'border-border', icon: 'text-text-muted' },
  added: { bg: 'bg-green-500/5', border: 'border-green-500/20', icon: 'text-green-400' },
  removed: { bg: 'bg-red-500/5', border: 'border-red-500/20', icon: 'text-red-400' },
  modified: { bg: 'bg-amber-500/5', border: 'border-amber-500/20', icon: 'text-amber-400' },
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function VersionDiffViewer({
  document,
  fromVersionId,
  toVersionId,
  onClose,
  onSwapVersions,
  onExportDiff,
}: VersionDiffViewerProps) {
  const [viewMode, setViewMode] = useState<DiffViewMode>('unified');
  const [showOnlyChanges, setShowOnlyChanges] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [zoom, setZoom] = useState(100);
  
  // Generate diff data
  const diff = useMemo(() => {
    return generateMockDiff(document, fromVersionId, toVersionId);
  }, [document, fromVersionId, toVersionId]);
  
  // Filter sections based on showOnlyChanges
  const visibleSections = useMemo(() => {
    if (showOnlyChanges) {
      return diff.sections.filter(s => s.changeType !== 'unchanged');
    }
    return diff.sections;
  }, [diff.sections, showOnlyChanges]);
  
  // Toggle section expansion
  const toggleSection = useCallback((sectionId: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  }, []);
  
  // Expand/collapse all
  const expandAll = useCallback(() => {
    setExpandedSections(new Set(diff.sections.map(s => s.id)));
  }, [diff.sections]);
  
  const collapseAll = useCallback(() => {
    setExpandedSections(new Set());
  }, []);
  
  // Get version info
  const fromVersion = document.versionHistory.find(v => v.versionId === fromVersionId);
  const toVersion = toVersionId === 'current' 
    ? { version: document.version, versionId: 'current', createdBy: document.lastModifiedBy, createdAt: document.updatedAt, changeDescription: 'Current version', status: document.status }
    : document.versionHistory.find(v => v.versionId === toVersionId);
  
  return (
    <div className="flex flex-col h-full bg-surface-elevated">
      {/* Header */}
      <div className="flex-none border-b border-border">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ArrowLeftRight className="w-5 h-5 text-accent-blue" />
            <div>
              <h2 className="text-sm font-medium text-text-primary">Version Comparison</h2>
              <p className="text-xs text-text-muted">{document.title}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" icon={<X className="w-4 h-4" />} onClick={onClose} />
        </div>
        
        {/* Version Headers */}
        <div className="px-4 pb-3 flex items-center gap-3">
          <VersionBadge 
            version={fromVersion?.version || diff.fromVersion} 
            label="From" 
            author={fromVersion?.createdBy}
            date={fromVersion?.createdAt}
            className="flex-1"
          />
          <Button 
            variant="ghost" 
            size="sm" 
            icon={<ArrowLeftRight className="w-4 h-4" />}
            onClick={onSwapVersions}
            title="Swap versions"
          />
          <VersionBadge 
            version={toVersion?.version || diff.toVersion}
            label="To"
            author={toVersion?.createdBy}
            date={toVersion?.createdAt}
            isCurrent={toVersionId === 'current'}
            className="flex-1"
          />
        </div>
      </div>
      
      {/* Summary Stats */}
      <div className="flex-none px-4 py-3 border-b border-border">
        <DiffSummaryStats summary={diff.summary} />
      </div>
      
      {/* Controls */}
      <div className="flex-none px-4 py-2 border-b border-border flex items-center justify-between gap-4 bg-surface">
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-muted">View:</span>
          <button
            onClick={() => setViewMode('unified')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg transition-colors ${
              viewMode === 'unified' 
                ? 'bg-accent-blue text-white' 
                : 'bg-surface-card text-text-secondary hover:bg-surface'
            }`}
          >
            <AlignJustify className="w-3.5 h-3.5" />
            Unified
          </button>
          <button
            onClick={() => setViewMode('split')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg transition-colors ${
              viewMode === 'split' 
                ? 'bg-accent-blue text-white' 
                : 'bg-surface-card text-text-secondary hover:bg-surface'
            }`}
          >
            <Columns className="w-3.5 h-3.5" />
            Split
          </button>
        </div>
        
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-text-secondary cursor-pointer">
            <input
              type="checkbox"
              checked={showOnlyChanges}
              onChange={(e) => setShowOnlyChanges(e.target.checked)}
              className="rounded border-border"
            />
            Show only changes
          </label>
          
          <div className="h-4 w-px bg-border" />
          
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="xs" icon={<ChevronDown className="w-3.5 h-3.5" />} onClick={expandAll} title="Expand all" />
            <Button variant="ghost" size="xs" icon={<ChevronRight className="w-3.5 h-3.5" />} onClick={collapseAll} title="Collapse all" />
          </div>
          
          <div className="h-4 w-px bg-border" />
          
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="xs" 
              icon={<ZoomOut className="w-3.5 h-3.5" />} 
              onClick={() => setZoom(Math.max(75, zoom - 10))} 
            />
            <span className="text-xs text-text-muted w-10 text-center">{zoom}%</span>
            <Button 
              variant="ghost" 
              size="xs" 
              icon={<ZoomIn className="w-3.5 h-3.5" />} 
              onClick={() => setZoom(Math.min(150, zoom + 10))} 
            />
          </div>
          
          <div className="h-4 w-px bg-border" />
          
          <Button 
            variant="ghost" 
            size="xs" 
            icon={<Download className="w-3.5 h-3.5" />}
            onClick={() => onExportDiff?.('pdf')}
          >
            Export
          </Button>
        </div>
      </div>
      
      {/* Diff Content */}
      <div className="flex-1 overflow-y-auto p-4" style={{ fontSize: `${zoom}%` }}>
        <div className="max-w-5xl mx-auto space-y-3">
          {visibleSections.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
              <p className="text-text-primary font-medium">No changes found</p>
              <p className="text-sm text-text-muted mt-1">
                {showOnlyChanges 
                  ? 'All sections are unchanged between these versions.' 
                  : 'The versions are identical.'}
              </p>
            </div>
          ) : viewMode === 'unified' ? (
            visibleSections.map(section => (
              <UnifiedDiffSection
                key={section.id}
                section={section}
                isExpanded={expandedSections.has(section.id)}
                onToggle={() => toggleSection(section.id)}
              />
            ))
          ) : (
            visibleSections.map(section => (
              <SplitDiffSection
                key={section.id}
                section={section}
                isExpanded={expandedSections.has(section.id)}
                onToggle={() => toggleSection(section.id)}
              />
            ))
          )}
        </div>
      </div>
      
      {/* Footer */}
      <div className="flex-none px-4 py-2 border-t border-border bg-surface flex items-center justify-between text-xs text-text-muted">
        <span>Generated {formatDate(diff.generatedAt)} at {formatTime(diff.generatedAt)}</span>
        <span>{visibleSections.length} section{visibleSections.length !== 1 ? 's' : ''} shown</span>
      </div>
    </div>
  );
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

interface VersionBadgeProps {
  version: string;
  label: string;
  author?: string;
  date?: string;
  isCurrent?: boolean;
  className?: string;
}

function VersionBadge({ version, label, author, date, isCurrent, className }: VersionBadgeProps) {
  return (
    <div className={`p-3 rounded-lg border border-border bg-surface-card ${className}`}>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs text-text-muted uppercase tracking-wider">{label}</span>
        {isCurrent && <Badge color="blue" size="sm">Current</Badge>}
      </div>
      <div className="flex items-center gap-2">
        <span className="font-mono font-bold text-text-primary">v{version}</span>
      </div>
      {(author || date) && (
        <div className="flex items-center gap-3 mt-1 text-xs text-text-muted">
          {author && <span className="flex items-center gap-1"><User className="w-3 h-3" />{author}</span>}
          {date && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatDate(date)}</span>}
        </div>
      )}
    </div>
  );
}

interface DiffSummaryStatsProps {
  summary: DiffSummary;
}

function DiffSummaryStats({ summary }: DiffSummaryStatsProps) {
  return (
    <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
      <div className="text-center p-2 rounded-lg bg-green-500/10">
        <div className="text-lg font-bold text-green-400">+{summary.addedLines}</div>
        <div className="text-xs text-text-muted">Added</div>
      </div>
      <div className="text-center p-2 rounded-lg bg-red-500/10">
        <div className="text-lg font-bold text-red-400">-{summary.removedLines}</div>
        <div className="text-xs text-text-muted">Removed</div>
      </div>
      <div className="text-center p-2 rounded-lg bg-amber-500/10">
        <div className="text-lg font-bold text-amber-400">~{summary.modifiedLines}</div>
        <div className="text-xs text-text-muted">Modified</div>
      </div>
      <div className="text-center p-2 rounded-lg bg-surface-card">
        <div className="text-lg font-bold text-accent-blue">{summary.modifiedSections}</div>
        <div className="text-xs text-text-muted">Sections</div>
      </div>
      <div className="text-center p-2 rounded-lg bg-surface-card">
        <div className="text-lg font-bold text-text-primary">
          {summary.netChange > 0 ? '+' : ''}{summary.netChange}
        </div>
        <div className="text-xs text-text-muted">Net Lines</div>
      </div>
      <div className="text-center p-2 rounded-lg bg-surface-card">
        <div className="text-lg font-bold text-text-secondary">{summary.changePercentage}%</div>
        <div className="text-xs text-text-muted">Changed</div>
      </div>
    </div>
  );
}

interface UnifiedDiffSectionProps {
  section: DiffSection;
  isExpanded: boolean;
  onToggle: () => void;
}

function UnifiedDiffSection({ section, isExpanded, onToggle }: UnifiedDiffSectionProps) {
  const colors = sectionChangeColorMap[section.changeType];
  
  const ChangeIcon = section.changeType === 'added' ? Plus :
    section.changeType === 'removed' ? Minus :
    section.changeType === 'modified' ? Edit :
    CheckCircle;
  
  return (
    <div className={`rounded-lg border ${colors?.border ?? ''} ${colors?.bg ?? ''} overflow-hidden`}>
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-text-muted" />
          ) : (
            <ChevronRight className="w-4 h-4 text-text-muted" />
          )}
          <ChangeIcon className={`w-4 h-4 ${colors?.icon ?? ''}`} />
          <span className="font-mono font-medium text-text-primary">{section.sectionNumber}</span>
          <span className="text-text-secondary">{section.sectionTitle}</span>
          <Badge 
            color={section.changeType === 'added' ? 'green' : section.changeType === 'removed' ? 'red' : section.changeType === 'modified' ? 'amber' : 'slate'} 
            size="sm"
          >
            {section.changeType}
          </Badge>
        </div>
        <div className="flex items-center gap-4 text-xs">
          {section.addedLines > 0 && <span className="text-green-400">+{section.addedLines}</span>}
          {section.removedLines > 0 && <span className="text-red-400">-{section.removedLines}</span>}
          {section.modifiedLines > 0 && <span className="text-amber-400">~{section.modifiedLines}</span>}
        </div>
      </button>
      
      {isExpanded && section.lines.length > 0 && (
        <div className="border-t border-border/50">
          {section.lines.map(line => (
            <UnifiedDiffLine key={line.id} line={line} />
          ))}
        </div>
      )}
    </div>
  );
}

interface UnifiedDiffLineProps {
  line: DiffLine;
}

function UnifiedDiffLine({ line }: UnifiedDiffLineProps) {
  const colors = lineTypeColorMap[line.type];
  
  const LineIcon = line.type === 'added' ? Plus :
    line.type === 'removed' ? Minus :
    line.type === 'modified' ? Edit :
    null;
  
  return (
    <div className={`flex items-start gap-2 px-4 py-2 font-mono text-xs ${colors?.bg ?? ''} border-l-2 ${colors?.border ?? ''}`}>
      {/* Line Numbers */}
      <div className="w-16 flex items-center gap-1 text-text-muted shrink-0">
        {line.lineNumber.from && (
          <span className="w-6 text-right text-red-400/70">{line.lineNumber.from}</span>
        )}
        {!line.lineNumber.from && <span className="w-6" />}
        {line.lineNumber.to && (
          <span className="w-6 text-right text-green-400/70">{line.lineNumber.to}</span>
        )}
        {!line.lineNumber.to && <span className="w-6" />}
      </div>
      
      {/* Change Icon */}
      <div className="w-5 shrink-0 flex items-center justify-center">
        {LineIcon && <LineIcon className={`w-3.5 h-3.5 ${colors?.text ?? ''}`} />}
      </div>
      
      {/* Content */}
      <div className={`flex-1 ${colors?.text ?? ''} whitespace-pre-wrap`}>
        {line.content}
      </div>
    </div>
  );
}

interface SplitDiffSectionProps {
  section: DiffSection;
  isExpanded: boolean;
  onToggle: () => void;
}

function SplitDiffSection({ section, isExpanded, onToggle }: SplitDiffSectionProps) {
  const colors = sectionChangeColorMap[section.changeType];
  
  const ChangeIcon = section.changeType === 'added' ? Plus :
    section.changeType === 'removed' ? Minus :
    section.changeType === 'modified' ? Edit :
    CheckCircle;
  
  // Separate lines into left (old) and right (new) columns
  const { leftLines, rightLines } = useMemo(() => {
    const left: (DiffLine | null)[] = [];
    const right: (DiffLine | null)[] = [];
    
    section.lines.forEach(line => {
      if (line.type === 'unchanged' || line.type === 'modified') {
        left.push(line);
        right.push(line);
      } else if (line.type === 'removed') {
        left.push(line);
        right.push(null);
      } else if (line.type === 'added') {
        left.push(null);
        right.push(line);
      }
    });
    
    // Balance the arrays
    const maxLen = Math.max(left.length, right.length);
    while (left.length < maxLen) left.push(null);
    while (right.length < maxLen) right.push(null);
    
    return { leftLines: left, rightLines: right };
  }, [section.lines]);
  
  return (
    <div className={`rounded-lg border ${colors?.border ?? ''} ${colors?.bg ?? ''} overflow-hidden`}>
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-text-muted" />
          ) : (
            <ChevronRight className="w-4 h-4 text-text-muted" />
          )}
          <ChangeIcon className={`w-4 h-4 ${colors?.icon ?? ''}`} />
          <span className="font-mono font-medium text-text-primary">{section.sectionNumber}</span>
          <span className="text-text-secondary">{section.sectionTitle}</span>
          <Badge 
            color={section.changeType === 'added' ? 'green' : section.changeType === 'removed' ? 'red' : section.changeType === 'modified' ? 'amber' : 'slate'} 
            size="sm"
          >
            {section.changeType}
          </Badge>
        </div>
        <div className="flex items-center gap-4 text-xs">
          {section.addedLines > 0 && <span className="text-green-400">+{section.addedLines}</span>}
          {section.removedLines > 0 && <span className="text-red-400">-{section.removedLines}</span>}
          {section.modifiedLines > 0 && <span className="text-amber-400">~{section.modifiedLines}</span>}
        </div>
      </button>
      
      {isExpanded && section.lines.length > 0 && (
        <div className="border-t border-border/50">
          {/* Split View Headers */}
          <div className="flex border-b border-border/50 bg-surface/50">
            <div className="flex-1 px-4 py-1.5 text-xs font-medium text-text-muted border-r border-border/50">
              Old Version
            </div>
            <div className="flex-1 px-4 py-1.5 text-xs font-medium text-text-muted">
              New Version
            </div>
          </div>
          
          {/* Split Content */}
          {leftLines.map((leftLine, idx) => (
            <div key={idx} className="flex">
              <SplitDiffLine line={leftLine} side="left" />
              <SplitDiffLine line={rightLines[idx]} side="right" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface SplitDiffLineProps {
  line: DiffLine | null;
  side: 'left' | 'right';
}

function SplitDiffLine({ line, side }: SplitDiffLineProps) {
  if (!line) {
    return (
      <div className={`flex-1 px-4 py-2 bg-surface/30 font-mono text-xs ${side === 'left' ? 'border-r border-border/50' : ''}`}>
        <span className="text-text-muted opacity-30">—</span>
      </div>
    );
  }
  
  const colors = lineTypeColorMap[line.type];
  const showOnLeft = line.type === 'removed' || line.type === 'unchanged' || line.type === 'modified';
  const showOnRight = line.type === 'added' || line.type === 'unchanged' || line.type === 'modified';
  
  // Determine if this line should show content on this side
  const shouldShow = (side === 'left' && showOnLeft) || (side === 'right' && showOnRight);
  
  // For removed lines, only show on left; for added lines, only show on right
  const isRelevant = (side === 'left' && line.type !== 'added') || (side === 'right' && line.type !== 'removed');
  
  const bgClass = isRelevant ? colors.bg : 'bg-surface/30';
  const textClass = isRelevant ? colors.text : 'text-text-muted opacity-30';
  
  return (
    <div className={`flex-1 flex items-start gap-2 px-4 py-2 font-mono text-xs ${bgClass} ${side === 'left' ? 'border-r border-border/50' : ''}`}>
      {/* Line Number */}
      <div className="w-8 text-right text-text-muted shrink-0">
        {side === 'left' && line.lineNumber.from}
        {side === 'right' && line.lineNumber.to}
      </div>
      
      {/* Content */}
      <div className={`flex-1 ${textClass} whitespace-pre-wrap`}>
        {isRelevant ? line.content : '—'}
      </div>
    </div>
  );
}

export default VersionDiffViewer;
