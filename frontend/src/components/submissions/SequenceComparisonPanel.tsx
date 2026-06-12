

import { useState, useMemo } from 'react';
import {
  GitCompare, ChevronRight, ChevronDown, Plus, Minus, RefreshCw,
  FileText, Folder, ArrowRight, Download, Filter, Eye, AlertCircle,
  CheckCircle, XCircle, ArrowUpRight, ArrowDownRight, Equal
} from 'lucide-react';
import {
  SequenceComparisonService,
  SequenceComparisonResult,
  DocumentChange,
  SectionChange,
  ChangeType,
  ComparisonFilter,
  sequenceComparisonService,
} from '@/services/sequence-comparison-service';

interface SequenceComparisonPanelProps {
  applicationNumber: string;
  availableSequences: string[];
  onComparisonComplete?: (result: SequenceComparisonResult) => void;
}

const changeTypeConfig: Record<ChangeType, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
  added: { label: 'Added', color: 'text-accent-green', bgColor: 'bg-accent-green/20', icon: <Plus className="w-3 h-3" /> },
  removed: { label: 'Removed', color: 'text-red-400', bgColor: 'bg-red-500/20', icon: <Minus className="w-3 h-3" /> },
  modified: { label: 'Modified', color: 'text-accent-amber', bgColor: 'bg-accent-amber/20', icon: <RefreshCw className="w-3 h-3" /> },
  replaced: { label: 'Replaced', color: 'text-accent-purple', bgColor: 'bg-accent-purple/20', icon: <ArrowRight className="w-3 h-3" /> },
  unchanged: { label: 'Unchanged', color: 'text-text-muted', bgColor: 'bg-surface-card', icon: <Equal className="w-3 h-3" /> },
};

const moduleLabels: Record<string, string> = {
  m1: 'Module 1 - Administrative',
  m2: 'Module 2 - Summaries',
  m3: 'Module 3 - Quality',
  m4: 'Module 4 - Nonclinical',
  m5: 'Module 5 - Clinical',
};

export function SequenceComparisonPanel({
  applicationNumber,
  availableSequences,
  onComparisonComplete,
}: SequenceComparisonPanelProps) {
  const [sourceSequence, setSourceSequence] = useState<string>(availableSequences[0] || '');
  const [targetSequence, setTargetSequence] = useState<string>(availableSequences[1] || availableSequences[0] || '');
  const [isComparing, setIsComparing] = useState(false);
  const [result, setResult] = useState<SequenceComparisonResult | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'summary' | 'by-section' | 'by-module' | 'flat'>('summary');
  const [filter, setFilter] = useState<ComparisonFilter>({});
  const [showUnchanged, setShowUnchanged] = useState(false);

  const runComparison = async () => {
    if (!sourceSequence || !targetSequence) return;
    
    setIsComparing(true);
    try {
      // Simulate async operation
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const comparisonResult = sequenceComparisonService.compareSequences(
        sourceSequence,
        targetSequence,
        applicationNumber
      );
      
      setResult(comparisonResult);
      onComparisonComplete?.(comparisonResult);
      
      // Auto-expand sections with changes
      const sectionsWithChanges = comparisonResult.sectionChanges
        .filter(s => s.changeType !== 'unchanged')
        .map(s => `${s.module}-${s.sectionId}`);
      setExpandedSections(new Set(sectionsWithChanges));
    } finally {
      setIsComparing(false);
    }
  };

  const toggleSection = (sectionKey: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionKey)) {
      newExpanded.delete(sectionKey);
    } else {
      newExpanded.add(sectionKey);
    }
    setExpandedSections(newExpanded);
  };

  // Filter document changes
  const filteredChanges = useMemo(() => {
    if (!result) return [];
    
    let changes = result.documentChanges;
    
    if (!showUnchanged) {
      changes = changes.filter(c => c.changeType !== 'unchanged');
    }
    
    if (filter.modules?.length) {
      changes = changes.filter(c => filter.modules!.includes(c.module));
    }
    
    if (filter.changeTypes?.length) {
      changes = changes.filter(c => filter.changeTypes!.includes(c.changeType));
    }
    
    if (filter.searchText) {
      const search = filter.searchText.toLowerCase();
      changes = changes.filter(c => 
        c.title.toLowerCase().includes(search) ||
        c.fileName.toLowerCase().includes(search)
      );
    }
    
    return changes;
  }, [result, filter, showUnchanged]);

  // Group filtered changes by module
  const changesByModule = useMemo(() => {
    const grouped: Record<string, DocumentChange[]> = {};
    for (const change of filteredChanges) {
      if (!grouped[change.module]) {
        grouped[change.module] = [];
      }
      grouped[change.module].push(change);
    }
    return grouped;
  }, [filteredChanges]);

  const formatBytes = (bytes: number): string => {
    const sign = bytes >= 0 ? '+' : '';
    const absBytes = Math.abs(bytes);
    if (absBytes < 1024) return `${sign}${bytes} B`;
    if (absBytes < 1024 * 1024) return `${sign}${(bytes / 1024).toFixed(1)} KB`;
    return `${sign}${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  const handleExport = (format: 'csv' | 'markdown') => {
    if (!result) return;
    const exported = sequenceComparisonService.exportComparison(result, format);
    
    const blob = new Blob([exported], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sequence-comparison-${sourceSequence}-${targetSequence}.${format === 'csv' ? 'csv' : 'md'}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-surface-elevated rounded-xl border border-border overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-accent-teal/20 flex items-center justify-center">
            <GitCompare className="w-5 h-5 text-accent-teal" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-text-primary">Sequence Comparison</h3>
            <p className="text-xs text-text-muted">
              Compare documents between submission sequences
            </p>
          </div>
        </div>
        
        {result && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleExport('csv')}
              className="px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary flex items-center gap-1"
            >
              <Download className="w-3 h-3" />
              CSV
            </button>
            <button
              onClick={() => handleExport('markdown')}
              className="px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary flex items-center gap-1"
            >
              <Download className="w-3 h-3" />
              Markdown
            </button>
          </div>
        )}
      </div>

      {/* Sequence Selection */}
      <div className="p-4 border-b border-border bg-surface">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="text-xs text-text-muted mb-1.5 block">Source Sequence</label>
            <select
              value={sourceSequence}
              onChange={(e) => setSourceSequence(e.target.value)}
              className="w-full px-3 py-2 bg-surface-card border border-border rounded-lg text-sm text-text-primary"
            >
              {availableSequences.map(seq => (
                <option key={seq} value={seq}>{seq}</option>
              ))}
            </select>
          </div>
          
          <div className="pt-5">
            <ArrowRight className="w-5 h-5 text-text-muted" />
          </div>
          
          <div className="flex-1">
            <label className="text-xs text-text-muted mb-1.5 block">Target Sequence</label>
            <select
              value={targetSequence}
              onChange={(e) => setTargetSequence(e.target.value)}
              className="w-full px-3 py-2 bg-surface-card border border-border rounded-lg text-sm text-text-primary"
            >
              {availableSequences.map(seq => (
                <option key={seq} value={seq}>{seq}</option>
              ))}
            </select>
          </div>
          
          <div className="pt-5">
            <button
              onClick={runComparison}
              disabled={isComparing || sourceSequence === targetSequence}
              className="px-4 py-2 bg-accent-teal text-white text-sm rounded-lg hover:bg-accent-teal/90 flex items-center gap-2 disabled:opacity-50"
            >
              {isComparing ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <GitCompare className="w-4 h-4" />
              )}
              Compare
            </button>
          </div>
        </div>
        
        {sourceSequence === targetSequence && (
          <p className="text-xs text-accent-amber mt-2 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            Select different sequences to compare
          </p>
        )}
      </div>

      {/* Comparison Progress */}
      {isComparing && (
        <div className="p-4 border-b border-border bg-accent-teal/5">
          <div className="flex items-center gap-3">
            <RefreshCw className="w-5 h-5 text-accent-teal animate-spin" />
            <div className="flex-1">
              <div className="text-sm text-text-primary">Comparing sequences...</div>
              <div className="text-xs text-text-muted">Analyzing document changes between {sourceSequence} and {targetSequence}</div>
            </div>
          </div>
        </div>
      )}

      {/* Results Summary */}
      {result && !isComparing && (
        <>
          {/* Summary Stats */}
          <div className="p-4 border-b border-border">
            <div className="grid grid-cols-5 gap-3">
              <div className="bg-accent-green/10 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-accent-green">{result.summary.documentsAdded}</div>
                <div className="text-xs text-text-muted">Added</div>
              </div>
              <div className="bg-red-500/10 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-red-400">{result.summary.documentsRemoved}</div>
                <div className="text-xs text-text-muted">Removed</div>
              </div>
              <div className="bg-accent-amber/10 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-accent-amber">{result.summary.documentsModified}</div>
                <div className="text-xs text-text-muted">Modified</div>
              </div>
              <div className="bg-surface-card rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-text-secondary">{result.summary.documentsUnchanged}</div>
                <div className="text-xs text-text-muted">Unchanged</div>
              </div>
              <div className={`rounded-lg p-3 text-center ${
                result.summary.totalSizeDelta >= 0 ? 'bg-accent-blue/10' : 'bg-accent-purple/10'
              }`}>
                <div className={`text-2xl font-bold ${
                  result.summary.totalSizeDelta >= 0 ? 'text-accent-blue' : 'text-accent-purple'
                }`}>
                  {formatBytes(result.summary.totalSizeDelta)}
                </div>
                <div className="text-xs text-text-muted">Size Delta</div>
              </div>
            </div>
          </div>

          {/* View Mode & Filters */}
          <div className="px-4 py-2 border-b border-border bg-surface flex items-center justify-between">
            <div className="flex items-center gap-2">
              {(['summary', 'by-module', 'by-section', 'flat'] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                    viewMode === mode
                      ? 'bg-accent-teal/20 text-accent-teal'
                      : 'text-text-muted hover:text-text-primary'
                  }`}
                >
                  {mode === 'summary' ? 'Summary' : 
                   mode === 'by-module' ? 'By Module' :
                   mode === 'by-section' ? 'By Section' : 'All Documents'}
                </button>
              ))}
            </div>
            
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-xs text-text-muted">
                <input
                  type="checkbox"
                  checked={showUnchanged}
                  onChange={(e) => setShowUnchanged(e.target.checked)}
                  className="rounded border-border"
                />
                Show unchanged
              </label>
              
              <input
                type="text"
                placeholder="Search documents..."
                value={filter.searchText || ''}
                onChange={(e) => setFilter({ ...filter, searchText: e.target.value || undefined })}
                className="px-3 py-1.5 text-xs bg-surface-card border border-border rounded-lg w-40"
              />
            </div>
          </div>

          {/* Results Content */}
          <div className="max-h-96 overflow-auto">
            {viewMode === 'summary' && (
              <div className="p-4 space-y-4">
                {/* Changes by Module Summary */}
                <div>
                  <h4 className="text-sm font-medium text-text-primary mb-3">Changes by Module</h4>
                  <div className="space-y-2">
                    {Object.entries(result.changesByModule).map(([module, stats]) => {
                      const totalChanges = stats.added + stats.removed + stats.modified;
                      if (totalChanges === 0 && !showUnchanged) return null;
                      
                      return (
                        <div key={module} className="flex items-center gap-3 p-2 bg-surface-card rounded-lg">
                          <Folder className="w-4 h-4 text-text-muted" />
                          <span className="text-sm text-text-primary flex-1">
                            {moduleLabels[module] || module}
                          </span>
                          <div className="flex items-center gap-2">
                            {stats.added > 0 && (
                              <span className="text-xs bg-accent-green/20 text-accent-green px-2 py-0.5 rounded">
                                +{stats.added}
                              </span>
                            )}
                            {stats.removed > 0 && (
                              <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded">
                                -{stats.removed}
                              </span>
                            )}
                            {stats.modified > 0 && (
                              <span className="text-xs bg-accent-amber/20 text-accent-amber px-2 py-0.5 rounded">
                                ~{stats.modified}
                              </span>
                            )}
                            {totalChanges === 0 && (
                              <span className="text-xs text-text-muted">No changes</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Quick List of Changes */}
                {filteredChanges.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-text-primary mb-3">
                      Recent Changes ({filteredChanges.length})
                    </h4>
                    <div className="space-y-1">
                      {filteredChanges.slice(0, 10).map((change) => {
                        const config = changeTypeConfig[change.changeType];
                        return (
                          <div key={change.id} className="flex items-center gap-2 p-2 hover:bg-surface-card rounded-lg">
                            <span className={`${config.bgColor} ${config?.color ?? ''} p-1 rounded`}>
                              {config.icon}
                            </span>
                            <FileText className="w-3 h-3 text-text-muted" />
                            <span className="text-sm text-text-primary flex-1 truncate">{change.title}</span>
                            <span className="text-xs text-text-muted">{change.section}</span>
                          </div>
                        );
                      })}
                      {filteredChanges.length > 10 && (
                        <button
                          onClick={() => setViewMode('flat')}
                          className="w-full text-center text-xs text-accent-teal py-2 hover:bg-accent-teal/10 rounded-lg"
                        >
                          View all {filteredChanges.length} changes
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {viewMode === 'by-module' && (
              <div className="divide-y divide-border">
                {Object.entries(changesByModule).map(([module, changes]) => (
                  <div key={module}>
                    <div
                      className="px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-surface-card transition-colors"
                      onClick={() => toggleSection(module)}
                    >
                      <ChevronRight className={`w-4 h-4 text-text-muted transition-transform ${
                        expandedSections.has(module) ? 'rotate-90' : ''
                      }`} />
                      <Folder className="w-4 h-4 text-text-muted" />
                      <span className="text-sm font-medium text-text-primary flex-1">
                        {moduleLabels[module] || module}
                      </span>
                      <span className="text-xs text-text-muted">{changes.length} document(s)</span>
                    </div>
                    
                    {expandedSections.has(module) && (
                      <div className="px-4 pb-3 space-y-1 bg-surface-card/50">
                        {changes.map((change) => (
                          <DocumentChangeRow key={change.id} change={change} />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {viewMode === 'by-section' && (
              <div className="divide-y divide-border">
                {result.sectionChanges
                  .filter(s => showUnchanged || s.changeType !== 'unchanged')
                  .map((section) => {
                    const sectionKey = `${section.module}-${section.sectionId}`;
                    const config = changeTypeConfig[section.changeType];
                    
                    return (
                      <div key={sectionKey}>
                        <div
                          className="px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-surface-card transition-colors"
                          onClick={() => toggleSection(sectionKey)}
                        >
                          <ChevronRight className={`w-4 h-4 text-text-muted transition-transform ${
                            expandedSections.has(sectionKey) ? 'rotate-90' : ''
                          }`} />
                          <span className={`${config.bgColor} ${config?.color ?? ''} p-1 rounded`}>
                            {config.icon}
                          </span>
                          <span className="text-sm font-medium text-text-primary flex-1">
                            {section.sectionTitle}
                          </span>
                          <span className="text-xs text-text-muted">{section.sectionId}</span>
                          <div className="flex items-center gap-1">
                            {section.addedCount > 0 && (
                              <span className="text-xs text-accent-green">+{section.addedCount}</span>
                            )}
                            {section.removedCount > 0 && (
                              <span className="text-xs text-red-400">-{section.removedCount}</span>
                            )}
                            {section.modifiedCount > 0 && (
                              <span className="text-xs text-accent-amber">~{section.modifiedCount}</span>
                            )}
                          </div>
                        </div>
                        
                        {expandedSections.has(sectionKey) && section.documentChanges.length > 0 && (
                          <div className="px-4 pb-3 space-y-1 bg-surface-card/50">
                            {section.documentChanges
                              .filter(c => showUnchanged || c.changeType !== 'unchanged')
                              .map((change) => (
                                <DocumentChangeRow key={change.id} change={change} />
                              ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}

            {viewMode === 'flat' && (
              <div className="divide-y divide-border">
                {filteredChanges.map((change) => (
                  <DocumentChangeRow key={change.id} change={change} showSection />
                ))}
                
                {filteredChanges.length === 0 && (
                  <div className="p-8 text-center text-text-muted">
                    <CheckCircle className="w-12 h-12 mx-auto mb-3 text-accent-green opacity-50" />
                    <p className="text-sm">No changes found matching current filters</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-border bg-surface flex items-center justify-between">
            <span className="text-xs text-text-muted">
              Compared in {new Date(result.comparedAt).toLocaleTimeString()}
            </span>
            <span className="text-xs text-text-muted">
              {result.summary.sectionsAffected} section(s) affected
            </span>
          </div>
        </>
      )}

      {/* Empty State */}
      {!result && !isComparing && (
        <div className="p-8 text-center">
          <GitCompare className="w-12 h-12 text-text-muted mx-auto mb-3 opacity-50" />
          <p className="text-sm text-text-secondary mb-1">Ready to compare</p>
          <p className="text-xs text-text-muted">
            Select two sequences and click "Compare" to see the differences
          </p>
        </div>
      )}
    </div>
  );
}

// Sub-component for document change rows
function DocumentChangeRow({ change, showSection = false }: { change: DocumentChange; showSection?: boolean }) {
  const config = changeTypeConfig[change.changeType];
  
  const formatBytes = (bytes: number): string => {
    const absBytes = Math.abs(bytes);
    if (absBytes < 1024) return `${bytes} B`;
    if (absBytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };
  
  return (
    <div className={`p-2 rounded-lg border ${config.bgColor} border-transparent flex items-center gap-2`}>
      <span className={config.color}>{config.icon}</span>
      <FileText className="w-3 h-3 text-text-muted" />
      <div className="flex-1 min-w-0">
        <div className="text-sm text-text-primary truncate">{change.title}</div>
        <div className="flex items-center gap-2 text-xs text-text-muted">
          <span>{change.fileName}</span>
          {showSection && (
            <>
              <span>•</span>
              <span>{change.module}/{change.section}</span>
            </>
          )}
          {change.leafOperation && (
            <>
              <span>•</span>
              <span className="text-accent-purple">{change.leafOperation}</span>
            </>
          )}
        </div>
      </div>
      
      {change.changeType !== 'unchanged' && (
        <div className="text-right">
          {change.sourceVersion && change.targetVersion && (
            <div className="text-xs text-text-muted">
              v{change.sourceVersion} → v{change.targetVersion}
            </div>
          )}
          {change.sizeDelta !== undefined && change.sizeDelta !== 0 && (
            <div className={`text-xs ${change.sizeDelta > 0 ? 'text-accent-blue' : 'text-accent-purple'}`}>
              {change.sizeDelta > 0 ? '+' : ''}{formatBytes(change.sizeDelta)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
