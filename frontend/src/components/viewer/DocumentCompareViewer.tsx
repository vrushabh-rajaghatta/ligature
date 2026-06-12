

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  X, ChevronLeft, ChevronRight, ChevronDown, ChevronUp,
  GitCompare, FileText, Plus, Minus, ArrowLeftRight,
  Lock, Unlock, ZoomIn, ZoomOut, Maximize2, Minimize2,
  Search, Settings, Filter, Download, Eye
} from 'lucide-react';
import { ViewerDocument, ViewerSection } from '@/store/useDocumentViewerStore';

// ============================================================================
// TYPES
// ============================================================================

interface DocumentCompareViewerProps {
  leftDocument: ViewerDocument;
  rightDocument: ViewerDocument;
  onClose: () => void;
}

interface DiffResult {
  sectionId: string;
  sectionNumber: string;
  sectionTitle: string;
  changeType: 'added' | 'removed' | 'modified' | 'unchanged';
  leftContent: string;
  rightContent: string;
  additions: number;
  deletions: number;
  diffLines?: DiffLine[];
}

interface DiffLine {
  type: 'context' | 'added' | 'removed';
  content: string;
  lineNumber?: number;
}

// ============================================================================
// DIFF UTILITIES
// ============================================================================

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

function computeSimpleDiff(oldText: string, newText: string): { additions: number; deletions: number; lines: DiffLine[] } {
  const oldLines = oldText.split(/\n|(?<=[.!?])\s+/);
  const newLines = newText.split(/\n|(?<=[.!?])\s+/);
  
  const lines: DiffLine[] = [];
  let additions = 0;
  let deletions = 0;
  
  const oldSet = new Set(oldLines.map(l => l.trim()).filter(Boolean));
  const newSet = new Set(newLines.map(l => l.trim()).filter(Boolean));
  
  // Find removed lines
  oldLines.forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !newSet.has(trimmed)) {
      lines.push({ type: 'removed', content: trimmed });
      deletions++;
    }
  });
  
  // Find added lines
  newLines.forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !oldSet.has(trimmed)) {
      lines.push({ type: 'added', content: trimmed });
      additions++;
    }
  });
  
  // Add some context
  newLines.slice(0, 3).forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && oldSet.has(trimmed)) {
      lines.unshift({ type: 'context', content: trimmed });
    }
  });
  
  return { additions, deletions, lines };
}

function compareSections(left: ViewerSection[], right: ViewerSection[]): DiffResult[] {
  const results: DiffResult[] = [];
  const leftMap = new Map<string, ViewerSection>();
  const rightMap = new Map<string, ViewerSection>();
  
  const flattenSections = (sections: ViewerSection[], map: Map<string, ViewerSection>) => {
    sections.forEach((s) => {
      map.set(s.number, s);
      if (s.subsections) flattenSections(s.subsections, map);
    });
  };
  
  flattenSections(left, leftMap);
  flattenSections(right, rightMap);
  
  // Find all unique section numbers
  const allNumbers = new Set([...Array.from(leftMap.keys()), ...Array.from(rightMap.keys())]);
  
  Array.from(allNumbers).sort().forEach((num) => {
    const leftSec = leftMap.get(num);
    const rightSec = rightMap.get(num);
    
    if (!leftSec && rightSec) {
      // Added in right
      results.push({
        sectionId: rightSec.id,
        sectionNumber: num,
        sectionTitle: rightSec.title,
        changeType: 'added',
        leftContent: '',
        rightContent: rightSec.content,
        additions: rightSec.wordCount,
        deletions: 0,
      });
    } else if (leftSec && !rightSec) {
      // Removed from right
      results.push({
        sectionId: leftSec.id,
        sectionNumber: num,
        sectionTitle: leftSec.title,
        changeType: 'removed',
        leftContent: leftSec.content,
        rightContent: '',
        additions: 0,
        deletions: leftSec.wordCount,
      });
    } else if (leftSec && rightSec) {
      const leftText = stripHtml(leftSec.content);
      const rightText = stripHtml(rightSec.content);
      
      if (leftText === rightText) {
        results.push({
          sectionId: rightSec.id,
          sectionNumber: num,
          sectionTitle: rightSec.title,
          changeType: 'unchanged',
          leftContent: leftSec.content,
          rightContent: rightSec.content,
          additions: 0,
          deletions: 0,
        });
      } else {
        const diff = computeSimpleDiff(leftText, rightText);
        results.push({
          sectionId: rightSec.id,
          sectionNumber: num,
          sectionTitle: rightSec.title,
          changeType: 'modified',
          leftContent: leftSec.content,
          rightContent: rightSec.content,
          additions: diff.additions,
          deletions: diff.deletions,
          diffLines: diff.lines,
        });
      }
    }
  });
  
  return results;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function DocumentCompareViewer({ leftDocument, rightDocument, onClose }: DocumentCompareViewerProps) {
  const [showOnlyChanges, setShowOnlyChanges] = useState(true);
  const [syncScroll, setSyncScroll] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  
  const leftScrollRef = useRef<HTMLDivElement>(null);
  const rightScrollRef = useRef<HTMLDivElement>(null);
  
  // Compute diff
  const diffResults = useMemo(() => {
    return compareSections(leftDocument.sections, rightDocument.sections);
  }, [leftDocument, rightDocument]);
  
  const displayedResults = showOnlyChanges
    ? diffResults.filter((d) => d.changeType !== 'unchanged')
    : diffResults;
  
  const totalAdditions = diffResults.reduce((sum, d) => sum + d.additions, 0);
  const totalDeletions = diffResults.reduce((sum, d) => sum + d.deletions, 0);
  const changedSections = diffResults.filter((d) => d.changeType !== 'unchanged').length;
  
  // Auto-expand modified sections
  useEffect(() => {
    const modifiedIds = diffResults
      .filter((d) => d.changeType === 'modified')
      .map((d) => d.sectionId);
    setExpandedSections(new Set(modifiedIds));
  }, [diffResults]);
  
  // Sync scroll
  const handleScroll = useCallback((source: 'left' | 'right') => {
    if (!syncScroll) return;
    
    const sourceRef = source === 'left' ? leftScrollRef : rightScrollRef;
    const targetRef = source === 'left' ? rightScrollRef : leftScrollRef;
    
    if (sourceRef.current && targetRef.current) {
      const scrollPercent = sourceRef.current.scrollTop / (sourceRef.current.scrollHeight - sourceRef.current.clientHeight);
      targetRef.current.scrollTop = scrollPercent * (targetRef.current.scrollHeight - targetRef.current.clientHeight);
    }
  }, [syncScroll]);
  
  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };
  
  const getChangeTypeStyles = (changeType: DiffResult['changeType']) => {
    switch (changeType) {
      case 'added':
        return { badge: 'bg-green-500/20 text-green-400', border: 'border-green-500/30' };
      case 'removed':
        return { badge: 'bg-red-500/20 text-red-400', border: 'border-red-500/30' };
      case 'modified':
        return { badge: 'bg-amber-500/20 text-amber-400', border: 'border-amber-500/30' };
      default:
        return { badge: 'bg-surface text-text-muted', border: 'border-border' };
    }
  };

  return (
    <div className="fixed inset-0 bg-surface z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-surface-elevated border-b border-border">
        <div className="flex items-center gap-4">
          <button
            onClick={onClose}
            className="p-2 hover:bg-surface-card rounded-lg text-text-muted hover:text-text-primary"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <GitCompare className="w-5 h-5 text-purple-400" />
            <div>
              <h1 className="font-semibold text-text-primary">Document Comparison</h1>
              <p className="text-xs text-text-muted">
                {leftDocument.shortTitle} v{leftDocument.version} → v{rightDocument.version}
              </p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Stats */}
          <div className="flex items-center gap-4 text-sm">
            <span className="text-text-muted">{changedSections} section{changedSections !== 1 ? 's' : ''} changed</span>
            <span className="text-green-400 flex items-center gap-1">
              <Plus className="w-4 h-4" /> {totalAdditions}
            </span>
            <span className="text-red-400 flex items-center gap-1">
              <Minus className="w-4 h-4" /> {totalDeletions}
            </span>
          </div>
          
          {/* Controls */}
          <div className="flex items-center gap-2 border-l border-border pl-4">
            <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
              <input
                type="checkbox"
                checked={showOnlyChanges}
                onChange={(e) => setShowOnlyChanges(e.target.checked)}
                className="rounded"
              />
              Show only changes
            </label>
            <button
              onClick={() => setSyncScroll(!syncScroll)}
              className={`p-2 rounded-lg ${syncScroll ? 'text-accent-blue bg-accent-blue/10' : 'text-text-muted hover:bg-surface-card'}`}
              title={syncScroll ? 'Synchronized scrolling on' : 'Synchronized scrolling off'}
            >
              {syncScroll ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Document headers */}
      <div className="flex border-b border-border bg-surface-card">
        <div className="flex-1 px-6 py-3 border-r border-border">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-text-muted" />
            <span className="font-medium text-text-primary">{leftDocument.title}</span>
          </div>
          <div className="text-xs text-text-muted mt-1">
            Version {leftDocument.version} • {new Date(leftDocument.lastModified).toLocaleDateString()}
          </div>
        </div>
        <div className="flex-1 px-6 py-3">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-text-muted" />
            <span className="font-medium text-text-primary">{rightDocument.title}</span>
          </div>
          <div className="text-xs text-text-muted mt-1">
            Version {rightDocument.version} • {new Date(rightDocument.lastModified).toLocaleDateString()}
          </div>
        </div>
      </div>

      {/* Diff content */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-auto p-6">
          <div className="max-w-6xl mx-auto space-y-4">
            {displayedResults.length === 0 ? (
              <div className="text-center py-12 text-text-muted">
                <GitCompare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg">No differences found</p>
                <p className="text-sm mt-2">The documents are identical</p>
              </div>
            ) : (
              displayedResults.map((result) => {
                const styles = getChangeTypeStyles(result.changeType);
                const isExpanded = expandedSections.has(result.sectionId);
                
                return (
                  <div
                    key={result.sectionId}
                    className={`border rounded-lg overflow-hidden ${styles?.border ?? ''}`}
                  >
                    {/* Section header */}
                    <button
                      onClick={() => toggleSection(result.sectionId)}
                      className="w-full flex items-center justify-between p-4 bg-surface-card hover:bg-surface-elevated transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-text-muted" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-text-muted" />
                        )}
                        <span className={`text-xs px-2 py-0.5 rounded ${styles.badge}`}>
                          {result.changeType}
                        </span>
                        <span className="text-sm font-medium text-text-primary">
                          Section {result.sectionNumber}: {result.sectionTitle}
                        </span>
                      </div>
                      {result.changeType !== 'unchanged' && (
                        <div className="flex items-center gap-3 text-xs">
                          {result.additions > 0 && (
                            <span className="text-green-400 flex items-center gap-1">
                              <Plus className="w-3 h-3" /> {result.additions}
                            </span>
                          )}
                          {result.deletions > 0 && (
                            <span className="text-red-400 flex items-center gap-1">
                              <Minus className="w-3 h-3" /> {result.deletions}
                            </span>
                          )}
                        </div>
                      )}
                    </button>
                    
                    {/* Section diff content */}
                    {isExpanded && (
                      <div className="border-t border-border">
                        {result.changeType === 'unchanged' ? (
                          <div className="p-4 text-sm text-text-muted italic">
                            No changes in this section
                          </div>
                        ) : result.diffLines && result.diffLines.length > 0 ? (
                          <div className="font-mono text-xs divide-y divide-border">
                            {result.diffLines.map((line, idx) => (
                              <div
                                key={idx}
                                className={`px-4 py-2 ${
                                  line.type === 'added'
                                    ? 'bg-green-500/10 text-green-400'
                                    : line.type === 'removed'
                                    ? 'bg-red-500/10 text-red-400'
                                    : 'text-text-secondary'
                                }`}
                              >
                                <span className="inline-block w-6 text-text-muted">
                                  {line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '}
                                </span>
                                {line.content}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="flex divide-x divide-border">
                            {/* Left (old) */}
                            <div
                              ref={leftScrollRef}
                              onScroll={() => handleScroll('left')}
                              className="flex-1 p-4 max-h-96 overflow-auto"
                            >
                              {result.changeType === 'removed' || result.changeType === 'modified' ? (
                                <div
                                  className="prose prose-invert prose-sm max-w-none text-red-400/80"
                                  dangerouslySetInnerHTML={{ __html: result.leftContent }}
                                />
                              ) : (
                                <div className="text-text-muted italic text-sm">Not present</div>
                              )}
                            </div>
                            {/* Right (new) */}
                            <div
                              ref={rightScrollRef}
                              onScroll={() => handleScroll('right')}
                              className="flex-1 p-4 max-h-96 overflow-auto"
                            >
                              {result.changeType === 'added' || result.changeType === 'modified' ? (
                                <div
                                  className="prose prose-invert prose-sm max-w-none text-green-400/80"
                                  dangerouslySetInnerHTML={{ __html: result.rightContent }}
                                />
                              ) : (
                                <div className="text-text-muted italic text-sm">Removed</div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-3 border-t border-border bg-surface-elevated flex items-center justify-between">
        <span className="text-xs text-text-muted">
          {displayedResults.length} section{displayedResults.length !== 1 ? 's' : ''} shown
          {showOnlyChanges && diffResults.length > displayedResults.length && (
            <span> ({diffResults.length - displayedResults.length} unchanged hidden)</span>
          )}
        </span>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary"
          >
            Close
          </button>
          <button className="px-4 py-2 text-sm bg-accent-blue text-white rounded-lg hover:bg-accent-blue/90 flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export Diff
          </button>
        </div>
      </div>
    </div>
  );
}
