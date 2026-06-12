

import { useState } from 'react';
import { GitCompare, X, ChevronDown, Plus, Minus, FileText, Clock, ArrowRight } from 'lucide-react';
import { AuthoringDocument } from '@/types/authoring';

interface VersionComparisonProps {
  document: AuthoringDocument;
  onClose: () => void;
}

const versions = [
  { version: '3.0', date: '2024-11-01', author: 'Jennifer Park', reason: 'Amendment 2 - Safety update' },
  { version: '2.0', date: '2024-08-15', author: 'Jennifer Park', reason: 'Amendment 1 - DSMB recommendation' },
  { version: '1.0', date: '2024-03-01', author: 'Sarah Chen', reason: 'Initial approved version' },
];

const mockDiffs = [
  { sectionNumber: '1', sectionTitle: 'Title Page', changeType: 'modified' as const, additions: 2, deletions: 1, diffContent: [
    { type: 'context' as const, content: 'Protocol Number: LIG-301-001' },
    { type: 'removed' as const, content: 'Version 2.0' },
    { type: 'added' as const, content: 'Version 3.0' },
    { type: 'added' as const, content: 'Amendment 2' },
  ]},
  { sectionNumber: '6', sectionTitle: 'Study Design', changeType: 'unchanged' as const, additions: 0, deletions: 0 },
  { sectionNumber: '8', sectionTitle: 'Safety Assessments', changeType: 'modified' as const, additions: 15, deletions: 3, diffContent: [
    { type: 'context' as const, content: '8.3.1 Adverse Event Monitoring' },
    { type: 'removed' as const, content: 'Subjects will be monitored for adverse events through Day 90.' },
    { type: 'added' as const, content: 'Subjects will be monitored for adverse events through Day 180.' },
    { type: 'added' as const, content: '8.3.2 Enhanced Cardiac Monitoring (NEW)' },
    { type: 'added' as const, content: 'Based on DSMB recommendations, enhanced cardiac monitoring will include:' },
    { type: 'added' as const, content: '• ECG at baseline, Week 4, Week 8, and Week 12' },
  ]},
  { sectionNumber: '10', sectionTitle: 'Data Monitoring', changeType: 'modified' as const, additions: 8, deletions: 2, diffContent: [
    { type: 'removed' as const, content: 'The DSMB will meet quarterly to review safety data.' },
    { type: 'added' as const, content: 'The DSMB will meet monthly to review safety data.' },
  ]},
];

export function VersionComparison({ document, onClose }: VersionComparisonProps) {
  const [baseVersion, setBaseVersion] = useState(versions[1].version);
  const [compareVersion, setCompareVersion] = useState(versions[0].version);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['8', '10']));
  const [showOnlyChanges, setShowOnlyChanges] = useState(true);

  const toggleSection = (sectionNumber: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionNumber)) newExpanded.delete(sectionNumber);
    else newExpanded.add(sectionNumber);
    setExpandedSections(newExpanded);
  };

  const displayedDiffs = showOnlyChanges ? mockDiffs.filter(d => d.changeType !== 'unchanged') : mockDiffs;
  const totalAdditions = mockDiffs.reduce((sum, d) => sum + d.additions, 0);
  const totalDeletions = mockDiffs.reduce((sum, d) => sum + d.deletions, 0);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-surface-elevated border border-border rounded-xl w-[900px] max-h-[85vh] flex flex-col shadow-2xl">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/20 rounded-lg"><GitCompare className="w-5 h-5 text-purple-400" /></div>
            <div>
              <h2 className="text-lg font-semibold text-text-primary">Version Comparison</h2>
              <p className="text-sm text-text-muted">{document.shortTitle}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-surface-card rounded-lg"><X className="w-5 h-5 text-text-muted" /></button>
        </div>

        <div className="px-6 py-4 bg-surface-card border-b border-border">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="text-xs text-text-muted mb-1 block">Base Version</label>
              <select value={baseVersion} onChange={(e) => setBaseVersion(e.target.value)} className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:border-accent-blue">
                {versions.slice(1).map(v => <option key={v.version} value={v.version}>v{v.version} - {v.reason}</option>)}
              </select>
            </div>
            <ArrowRight className="w-5 h-5 text-text-muted mt-5" />
            <div className="flex-1">
              <label className="text-xs text-text-muted mb-1 block">Compare Version</label>
              <select value={compareVersion} onChange={(e) => setCompareVersion(e.target.value)} className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:border-accent-blue">
                {versions.map(v => <option key={v.version} value={v.version}>v{v.version} - {v.reason}</option>)}
              </select>
            </div>
          </div>
          <div className="flex items-center gap-6 mt-4">
            <span className="text-sm text-accent-green">+{totalAdditions} additions</span>
            <span className="text-sm text-red-400">-{totalDeletions} deletions</span>
            <div className="flex-1" />
            <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
              <input type="checkbox" checked={showOnlyChanges} onChange={(e) => setShowOnlyChanges(e.target.checked)} />Show only changes
            </label>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6">
          <div className="space-y-3">
            {displayedDiffs.map(section => (
              <div key={section.sectionNumber} className="border border-border rounded-lg overflow-hidden">
                <button onClick={() => toggleSection(section.sectionNumber)} className="w-full flex items-center justify-between p-3 bg-surface-card hover:bg-surface transition-colors">
                  <div className="flex items-center gap-3">
                    <ChevronDown className={`w-4 h-4 text-text-muted transition-transform ${expandedSections.has(section.sectionNumber) ? '' : '-rotate-90'}`} />
                    <span className={`text-xs px-2 py-0.5 rounded ${section.changeType === 'modified' ? 'bg-amber-500/20 text-amber-400' : section.changeType === 'unchanged' ? 'bg-surface text-text-muted' : 'bg-accent-green/20 text-accent-green'}`}>{section.changeType}</span>
                    <span className="text-sm font-medium text-text-primary">Section {section.sectionNumber}: {section.sectionTitle}</span>
                  </div>
                  {section.changeType !== 'unchanged' && (
                    <div className="flex items-center gap-3 text-xs">
                      {section.additions > 0 && <span className="text-accent-green flex items-center gap-1"><Plus className="w-3 h-3" />{section.additions}</span>}
                      {section.deletions > 0 && <span className="text-red-400 flex items-center gap-1"><Minus className="w-3 h-3" />{section.deletions}</span>}
                    </div>
                  )}
                </button>
                {expandedSections.has(section.sectionNumber) && section.diffContent && (
                  <div className="border-t border-border bg-surface font-mono text-xs">
                    {section.diffContent.map((line, idx) => (
                      <div key={idx} className={`px-4 py-1 ${line.type === 'added' ? 'bg-accent-green/10 text-accent-green' : line.type === 'removed' ? 'bg-red-500/10 text-red-400' : 'text-text-secondary'}`}>
                        <span className="inline-block w-6 text-text-muted">{line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '}</span>
                        {line.content}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-border flex justify-between">
          <span className="text-xs text-text-muted flex items-center gap-1"><Clock className="w-3 h-3" />v{baseVersion} → v{compareVersion}</span>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary">Close</button>
            <button className="px-4 py-2 bg-accent-blue text-white rounded-lg text-sm hover:bg-accent-blue/90">Export</button>
          </div>
        </div>
      </div>
    </div>
  );
}
