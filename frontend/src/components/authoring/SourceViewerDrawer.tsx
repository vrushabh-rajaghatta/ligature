
import { useState } from 'react';

import { X, FileText, Link2, CheckCircle, Clock, ExternalLink, BookOpen, Tag, ChevronLeft, List } from 'lucide-react';
import { SourceDocument, useAuthoringStore } from '@/store/useAuthoringStore';
import { Badge } from '@/components/ui/Badge';

interface SourceViewerDrawerProps {
  source: SourceDocument | null;
  onClose: () => void;
}

const STATUS_CONFIG = {
  available: { label: 'Available', color: 'green' as const },
  linked: { label: 'Linked', color: 'blue' as const },
  pending: { label: 'Pending', color: 'amber' as const },
};

const TYPE_LABELS: Record<string, string> = {
  'clinical-study-report': 'Clinical Study Report',
  'protocol': 'Protocol',
  'statistical-analysis-plan': 'Statistical Analysis Plan',
  'integrated-summary': 'Integrated Summary',
  'safety-report': 'Safety Report',
  'nonclinical': 'Nonclinical Study',
  'literature': 'Literature Reference',
};

// Mock section excerpts for demo richness
const MOCK_EXCERPTS: Record<string, string> = {
  '1': 'This section provides an overview of the study design, including the primary and secondary endpoints established prior to study initiation.',
  '2': 'Patient demographics and baseline characteristics were balanced across treatment arms. Mean age was 52.4 years (SD 11.2). 54% male.',
  '3': 'The primary endpoint, reduction in HbA1c from baseline at Week 24, was met with statistical significance (p<0.001, 95% CI: -1.2 to -0.8).',
  '4': 'Adverse events were consistent with the known safety profile. No new safety signals identified. SAE rate: 4.2% treatment vs 3.8% placebo.',
  '5': 'Pharmacokinetic parameters demonstrated dose-proportional exposure. Tmax: 2.1h, T½: 14.3h, AUC0-24: 847 ng·h/mL.',
};

export function SourceViewerDrawer({ source, onClose }: SourceViewerDrawerProps) {
  // v0.59.0: pull real availableSources from store
  const allSources = useAuthoringStore(s => s.availableSources);
  const [activeSource, setActiveSource] = useState<SourceDocument | null>(source);
  const [showList, setShowList] = useState(false);

  const displaySource = activeSource || source;

  if (!displaySource) return null;

  const statusConfig = STATUS_CONFIG[displaySource.status] || STATUS_CONFIG.available;
  const typeLabel = TYPE_LABELS[displaySource.type] || displaySource.type;

  const sections = displaySource.sections && displaySource.sections.length > 0
    ? displaySource.sections
    : [
        { id: 's1', number: '1', title: 'Study Overview & Design', excerpt: MOCK_EXCERPTS['1'] },
        { id: 's2', number: '2', title: 'Patient Population & Demographics', excerpt: MOCK_EXCERPTS['2'] },
        { id: 's3', number: '3', title: 'Efficacy Results', excerpt: MOCK_EXCERPTS['3'] },
        { id: 's4', number: '4', title: 'Safety & Adverse Events', excerpt: MOCK_EXCERPTS['4'] },
        { id: 's5', number: '5', title: 'Pharmacokinetic Summary', excerpt: MOCK_EXCERPTS['5'] },
      ];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 z-50 w-[480px] bg-surface-elevated border-l border-border flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between p-4 border-b border-border flex-shrink-0">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 bg-accent-blue/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
              <FileText className="w-5 h-5 text-accent-blue" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-text-primary leading-tight">{displaySource.title}</h2>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <Badge color="slate" size="sm">{typeLabel}</Badge>
                <Badge color={statusConfig.color} size="sm">{statusConfig.label}</Badge>
                <span className="text-xs text-text-muted">v{displaySource.version}</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-card transition-colors flex-shrink-0 ml-2"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        {/* v0.59.0: source list toggle when real sources available */}
        {allSources.length > 1 && !showList && (
          <button
            onClick={() => setShowList(true)}
            className="mt-2 text-xs flex items-center gap-1 text-accent-blue hover:underline"
          >
            <List className="w-3 h-3" />
            Browse all {allSources.length} sources
          </button>
        )}

        {/* Metadata strip */}
        <div className="px-4 py-3 bg-surface-card border-b border-border flex items-center gap-4 flex-shrink-0">
          <div className="flex items-center gap-1.5 text-xs text-text-muted">
            <Tag className="w-3.5 h-3.5" />
            <span>Source ID:</span>
            <span className="font-mono text-text-secondary">{displaySource.id.toUpperCase()}</span>
          </div>
          {displaySource.status === 'linked' && (
            <div className="flex items-center gap-1.5 text-xs text-accent-green">
              <Link2 className="w-3.5 h-3.5" />
              <span>Linked to document</span>
            </div>
          )}
          {displaySource.status === 'available' && (
            <div className="flex items-center gap-1.5 text-xs text-text-muted">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Ready to link</span>
            </div>
          )}
          {displaySource.status === 'pending' && (
            <div className="flex items-center gap-1.5 text-xs text-accent-amber">
              <Clock className="w-3.5 h-3.5" />
              <span>Pending review</span>
            </div>
          )}
        </div>

        {/* v0.59.0: Source list overlay */}
        {showList && (
          <div className="flex-1 overflow-y-auto">
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-text-primary">Available Sources</h3>
                <button onClick={() => setShowList(false)} className="text-xs text-text-muted hover:text-text-primary">
                  Close list
                </button>
              </div>
              <div className="space-y-2">
                {(allSources.length > 0 ? allSources : [displaySource]).map(s => (
                  <button
                    key={s.id}
                    onClick={() => { setActiveSource(s); setShowList(false); }}
                    className={`w-full flex items-start gap-3 p-3 rounded-lg border text-left transition-colors ${
                      s.id === displaySource.id
                        ? 'border-accent-blue bg-accent-blue/5'
                        : 'border-border bg-surface-card hover:border-accent-blue/40'
                    }`}
                  >
                    <FileText className="w-4 h-4 text-accent-blue mt-0.5 flex-shrink-0" />
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-text-primary leading-snug">{s.title}</div>
                      <div className="text-xs text-text-muted mt-0.5">v{s.version} · {STATUS_CONFIG[s.status]?.label ?? s.status}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Sections */}
        {!showList && (
          <div className="flex-1 overflow-y-auto p-4">
            <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-3">
              Document Sections
            </h3>
            <div className="space-y-3">
              {sections.map((section) => (
                <div
                  key={section.id}
                  className="bg-surface-card border border-border rounded-lg p-3 hover:border-accent-blue/40 transition-colors cursor-pointer group"
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-text-muted bg-surface px-1.5 py-0.5 rounded border border-border">
                        §{section.number}
                      </span>
                      <span className="text-sm font-medium text-text-primary">{section.title}</span>
                    </div>
                    <BookOpen className="w-3.5 h-3.5 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5" />
                  </div>
                  {section.excerpt && (
                    <p className="text-xs text-text-secondary leading-relaxed line-clamp-3">
                      {section.excerpt}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer actions */}
        {!showList && (
        <div className="p-4 border-t border-border bg-surface flex-shrink-0 flex items-center gap-2">
          <button
            onClick={onClose}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-accent-blue text-white text-sm font-medium rounded-lg hover:bg-accent-blue/90 transition-colors"
          >
            <Link2 className="w-4 h-4" />
            Use as Source
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-text-secondary border border-border rounded-lg hover:bg-surface-card transition-colors flex items-center gap-2"
          >
            <ExternalLink className="w-4 h-4" />
            Open Full Doc
          </button>
        </div>
        )}
      </div>
    </>
  );
}
