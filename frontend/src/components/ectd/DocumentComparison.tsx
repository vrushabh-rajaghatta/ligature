

import { useState, useMemo } from 'react';
import {
  GitCompare,
  FileText,
  ChevronLeft,
  ChevronRight,
  X,
  RefreshCw,
  Plus,
  Trash2,
  FilePlus,
  Eye,
  Download,
  ArrowLeftRight,
  Maximize2,
  Minimize2,
  Clock,
} from 'lucide-react';
import { ECTDDocument, ECTDApplication, ECTDSequence } from '@/types/ectd';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import type { BadgeColor } from '@/components/ui/Badge';

// ============================================================================
// DOCUMENT COMPARISON - v164
// Side-by-side comparison of document versions across sequences
// Industry feature from EXTEDO, Lorenz docuBridge, Veeva
// ============================================================================

interface DocumentComparisonProps {
  application: ECTDApplication;
  documentKey: string; // module-section identifier
  onClose: () => void;
}

interface DocumentVersion {
  document: ECTDDocument;
  sequence: ECTDSequence;
  sequenceIndex: number;
}

// Operation colors
const operationColorMap: Record<ECTDDocument['operation'], BadgeColor> = {
  'new': 'green',
  'replace': 'amber',
  'append': 'blue',
  'delete': 'red',
};

const operationIconMap: Record<ECTDDocument['operation'], React.ReactNode> = {
  'new': <FilePlus className="w-3 h-3" />,
  'replace': <RefreshCw className="w-3 h-3" />,
  'append': <Plus className="w-3 h-3" />,
  'delete': <Trash2 className="w-3 h-3" />,
};

export function DocumentComparison({
  application,
  documentKey,
  onClose,
}: DocumentComparisonProps) {
  const [leftVersion, setLeftVersion] = useState<number>(0);
  const [rightVersion, setRightVersion] = useState<number>(-1); // -1 = latest
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Build version history for this document
  const versions = useMemo(() => {
    const history: DocumentVersion[] = [];
    
    application.sequences.forEach((seq, seqIndex) => {
      seq.documents.forEach(doc => {
        const key = `${doc.module}-${doc.section || doc.title}`;
        if (key === documentKey) {
          history.push({
            document: doc,
            sequence: seq,
            sequenceIndex: seqIndex,
          });
        }
      });
    });

    return history;
  }, [application.sequences, documentKey]);

  // Resolved indices
  const leftIndex = leftVersion;
  const rightIndex = rightVersion === -1 ? versions.length - 1 : rightVersion;

  const leftDoc = versions[leftIndex];
  const rightDoc = versions[rightIndex];

  // Get document title from first version
  const documentTitle = versions[0]?.document.title || 'Unknown Document';

  const handleSwapVersions = () => {
    setLeftVersion(rightIndex);
    setRightVersion(leftIndex);
  };

  if (versions.length < 2) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <GitCompare className="w-5 h-5 text-accent-blue" />
            <span className="font-medium text-text-primary">Document Comparison</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-surface-card transition-colors"
          >
            <X className="w-4 h-4 text-text-muted" />
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center p-8 text-center">
          <div>
            <FileText className="w-12 h-12 mx-auto mb-4 text-text-muted opacity-50" />
            <h3 className="text-lg font-medium text-text-primary mb-2">Single Version Only</h3>
            <p className="text-sm text-text-muted max-w-md">
              This document has only one version in the submission history.
              Document comparison requires at least two versions across sequences.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col ${isFullscreen ? 'fixed inset-0 z-50 bg-surface' : 'h-full'}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-surface-elevated">
        <div className="flex items-center gap-3">
          <GitCompare className="w-5 h-5 text-accent-blue" />
          <div>
            <h3 className="font-medium text-text-primary">Document Comparison</h3>
            <p className="text-xs text-text-muted">{documentTitle}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge color="slate" size="sm">
            {versions.length} versions
          </Badge>
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 rounded hover:bg-surface-card transition-colors"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4 text-text-muted" />
            ) : (
              <Maximize2 className="w-4 h-4 text-text-muted" />
            )}
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-surface-card transition-colors"
          >
            <X className="w-4 h-4 text-text-muted" />
          </button>
        </div>
      </div>

      {/* Version Selectors */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface">
        {/* Left Version Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-muted">Original:</span>
          <select
            value={leftVersion}
            onChange={(e) => setLeftVersion(parseInt(e.target.value))}
            className="px-2 py-1 bg-surface-card border border-border rounded text-sm text-text-primary"
          >
            {versions.map((v, idx) => (
              <option key={idx} value={idx} disabled={idx === rightIndex}>
                Seq {v.sequence.sequenceNumber} ({v.document.operation})
              </option>
            ))}
          </select>
        </div>

        {/* Swap Button */}
        <button
          onClick={handleSwapVersions}
          className="p-2 rounded-lg hover:bg-surface-card transition-colors"
          title="Swap versions"
        >
          <ArrowLeftRight className="w-4 h-4 text-text-muted" />
        </button>

        {/* Right Version Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-muted">Revised:</span>
          <select
            value={rightVersion}
            onChange={(e) => setRightVersion(parseInt(e.target.value))}
            className="px-2 py-1 bg-surface-card border border-border rounded text-sm text-text-primary"
          >
            {versions.map((v, idx) => (
              <option key={idx} value={idx} disabled={idx === leftIndex}>
                Seq {v.sequence.sequenceNumber} ({v.document.operation})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Comparison Panels */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel */}
        <div className="flex-1 flex flex-col border-r border-border">
          {leftDoc && (
            <>
              <div className="p-3 bg-surface-card border-b border-border">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-text-primary">
                        Sequence {leftDoc.sequence.sequenceNumber}
                      </span>
                      <Badge color={operationColorMap[leftDoc.document.operation]} size="xs">
                        {leftDoc.document.operation}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-text-muted">
                      <Clock className="w-3 h-3" />
                      {new Date(leftDoc.sequence.submissionDate).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm">
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
              <div className="flex-1 overflow-hidden bg-slate-900">
                {/* In production, this would load the actual PDF */}
                <div className="flex items-center justify-center h-full text-slate-400">
                  <div className="text-center">
                    <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">{leftDoc.document.title}</p>
                    <p className="text-xs mt-1 text-slate-500">{leftDoc.document.filePath}</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Right Panel */}
        <div className="flex-1 flex flex-col">
          {rightDoc && (
            <>
              <div className="p-3 bg-surface-card border-b border-border">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-text-primary">
                        Sequence {rightDoc.sequence.sequenceNumber}
                      </span>
                      <Badge color={operationColorMap[rightDoc.document.operation]} size="xs">
                        {rightDoc.document.operation}
                      </Badge>
                      {rightIndex === versions.length - 1 && (
                        <Badge color="purple" size="xs">Current</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-text-muted">
                      <Clock className="w-3 h-3" />
                      {new Date(rightDoc.sequence.submissionDate).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm">
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
              <div className="flex-1 overflow-hidden bg-slate-900">
                {/* In production, this would load the actual PDF */}
                <div className="flex items-center justify-center h-full text-slate-400">
                  <div className="text-center">
                    <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">{rightDoc.document.title}</p>
                    <p className="text-xs mt-1 text-slate-500">{rightDoc.document.filePath}</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Footer with Change Summary */}
      <div className="px-4 py-3 border-t border-border bg-surface-card/50">
        <div className="flex items-center justify-between text-xs text-text-muted">
          <span>
            Comparing: Seq {leftDoc?.sequence.sequenceNumber} → Seq {rightDoc?.sequence.sequenceNumber}
          </span>
          <span className="flex items-center gap-2">
            <span className="text-accent-amber flex items-center gap-1">
              <RefreshCw className="w-3 h-3" />
              Replace operation between versions
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}

export default DocumentComparison;
