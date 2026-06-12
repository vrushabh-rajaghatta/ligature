

import { useState, useCallback } from 'react';
import {
  Link2,
  Search,
  Zap,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Filter,
  Plus,
  Trash2,
  ExternalLink,
  Clock,
} from 'lucide-react';
import { 
  hyperlinkService, 
  DetectedReference, 
  Hyperlink, 
  HyperlinkValidationResult,
  DocumentLinkSummary,
} from '@/services/hyperlink-service';
import { ECTDDocument } from '@/types/ectd';

interface HyperlinkManagerPanelProps {
  documents: ECTDDocument[];
  selectedDocument?: ECTDDocument | null;
}

export function HyperlinkManagerPanel({ documents, selectedDocument }: HyperlinkManagerPanelProps) {
  const [activeTab, setActiveTab] = useState<'detect' | 'manage' | 'validate'>('detect');
  const [isProcessing, setIsProcessing] = useState(false);
  const [detectedRefs, setDetectedRefs] = useState<DetectedReference[]>([]);
  const [hyperlinks, setHyperlinks] = useState<Hyperlink[]>([]);
  const [validationResults, setValidationResults] = useState<HyperlinkValidationResult[]>([]);
  const [filterType, setFilterType] = useState<string>('all');
  const [autoLinkResult, setAutoLinkResult] = useState<{ linked: number; skipped: number; failed: number } | null>(null);

  // Register all documents on mount
  useState(() => {
    documents.forEach(doc => {
      hyperlinkService.registerDocument(doc.id, doc.title, doc.module, doc.section || '');
    });
  });

  const handleScanDocument = useCallback(async () => {
    if (!selectedDocument) return;
    
    setIsProcessing(true);
    try {
      // Register document
      hyperlinkService.registerDocument(
        selectedDocument.id,
        selectedDocument.title,
        selectedDocument.module,
        selectedDocument.section || ''
      );

      // Simulate document content for demo
      const mockContent = generateMockContent(selectedDocument);

      const refs = await hyperlinkService.scanDocument(
        selectedDocument.id,
        mockContent,
        selectedDocument.module
      );
      setDetectedRefs(refs);
      setAutoLinkResult(null);
    } finally {
      setIsProcessing(false);
    }
  }, [selectedDocument]);

  const handleScanAll = useCallback(async () => {
    setIsProcessing(true);
    try {
      const allRefs: DetectedReference[] = [];
      
      for (const doc of documents) {
        hyperlinkService.registerDocument(doc.id, doc.title, doc.module, doc.section || '');
        const mockContent = generateMockContent(doc);
        const refs = await hyperlinkService.scanDocument(doc.id, mockContent, doc.module);
        allRefs.push(...refs);
      }
      
      setDetectedRefs(allRefs);
      setAutoLinkResult(null);
    } finally {
      setIsProcessing(false);
    }
  }, [documents]);

  const handleAutoLink = useCallback(async () => {
    setIsProcessing(true);
    try {
      let totalLinked = 0, totalSkipped = 0, totalFailed = 0;
      
      const docIds = selectedDocument 
        ? [selectedDocument.id]
        : Array.from(new Set(detectedRefs.map(r => r.sourceDocument)));

      for (const docId of docIds) {
        const result = await hyperlinkService.autoLink(docId, { minConfidence: 70 });
        totalLinked += result.linked;
        totalSkipped += result.skipped;
        totalFailed += result.failed;
      }
      
      // Refresh hyperlinks
      const allLinks = docIds.flatMap(id => hyperlinkService.getDocumentHyperlinks(id));
      setHyperlinks(allLinks);
      setAutoLinkResult({ linked: totalLinked, skipped: totalSkipped, failed: totalFailed });

      // Update detected refs status
      const updatedRefs = detectedRefs.map(ref => ({
        ...ref,
        status: ref.suggestedTarget && ref.confidence >= 70 ? 'linked' as const : ref.status,
      }));
      setDetectedRefs(updatedRefs);
    } finally {
      setIsProcessing(false);
    }
  }, [selectedDocument, detectedRefs]);

  const handleValidateLinks = useCallback(async () => {
    setIsProcessing(true);
    try {
      const results = await hyperlinkService.validateLinks(
        selectedDocument ? { documentId: selectedDocument.id } : {}
      );
      setValidationResults(results);

      // Update hyperlink statuses
      const updatedLinks = hyperlinks.map(link => {
        const result = results.find(r => r.linkId === link.id);
        return result ? { ...link, status: result.status === 'valid' ? 'valid' as const : 'broken' as const } : link;
      });
      setHyperlinks(updatedLinks);
    } finally {
      setIsProcessing(false);
    }
  }, [selectedDocument, hyperlinks]);

  const handleDeleteLink = useCallback((linkId: string) => {
    hyperlinkService.deleteHyperlink(linkId);
    setHyperlinks(prev => prev.filter(l => l.id !== linkId));
  }, []);

  const filteredRefs = filterType === 'all' 
    ? detectedRefs 
    : detectedRefs.filter(r => r.type === filterType);

  const refTypes = ['all', 'study', 'table', 'figure', 'section', 'appendix', 'reference', 'module'];

  const stats = {
    total: hyperlinks.length,
    valid: hyperlinks.filter(l => l.status === 'valid').length,
    broken: hyperlinks.filter(l => l.status === 'broken').length,
    pending: hyperlinks.filter(l => l.status === 'pending').length,
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b border-border">
        <div className="flex items-center gap-2 mb-2">
          <Link2 className="w-5 h-5 text-accent-blue" />
          <h3 className="font-semibold text-text-primary">Hyperlink Manager</h3>
        </div>
        <p className="text-xs text-text-muted">
          Detect, create, and validate hyperlinks across eCTD documents
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-2 border-b border-border">
        {(['detect', 'manage', 'validate'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              activeTab === tab
                ? 'bg-accent-blue text-white'
                : 'text-text-secondary hover:bg-surface-card'
            }`}
          >
            {tab === 'detect' && 'Detect'}
            {tab === 'manage' && `Manage (${stats.total})`}
            {tab === 'validate' && 'Validate'}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-3">
        {activeTab === 'detect' && (
          <>
            {/* Scan actions */}
            <div className="flex gap-2 mb-3">
              <button
                onClick={handleScanDocument}
                disabled={!selectedDocument || isProcessing}
                className="flex-1 px-3 py-2 bg-accent-blue text-white text-sm font-medium rounded-lg hover:bg-accent-blue/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
                Scan Selected
              </button>
              <button
                onClick={handleScanAll}
                disabled={isProcessing || documents.length === 0}
                className="px-3 py-2 bg-surface-card text-text-primary text-sm font-medium rounded-lg border border-border hover:bg-surface disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Scan All
              </button>
            </div>

            {/* Auto-link button */}
            {detectedRefs.length > 0 && (
              <button
                onClick={handleAutoLink}
                disabled={isProcessing}
                className="w-full mb-3 px-3 py-2 bg-accent-teal text-white text-sm font-medium rounded-lg hover:bg-accent-teal/90 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Zap className="w-4 h-4" />
                Auto-Link {filteredRefs.filter(r => r.confidence >= 70 && r.suggestedTarget).length} References
              </button>
            )}

            {/* Auto-link result */}
            {autoLinkResult && (
              <div className="mb-3 p-2 bg-accent-green/10 border border-accent-green/30 rounded-lg text-xs">
                <span className="text-accent-green font-medium">{autoLinkResult.linked} linked</span>
                <span className="text-text-muted"> • {autoLinkResult.skipped} skipped • {autoLinkResult.failed} failed</span>
              </div>
            )}

            {/* Filter */}
            {detectedRefs.length > 0 && (
              <div className="flex items-center gap-2 mb-3">
                <Filter className="w-4 h-4 text-text-muted" />
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="flex-1 px-2 py-1.5 text-sm bg-surface-card border border-border rounded-lg"
                >
                  {refTypes.map(type => (
                    <option key={type} value={type}>
                      {type === 'all' ? `All Types (${detectedRefs.length})` : `${type.charAt(0).toUpperCase() + type.slice(1)} (${detectedRefs.filter(r => r.type === type).length})`}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Results */}
            {filteredRefs.length === 0 ? (
              <div className="text-center py-8 text-text-muted text-sm">
                {selectedDocument 
                  ? 'Click "Scan Selected" to detect linkable references'
                  : 'Select a document or click "Scan All"'}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredRefs.slice(0, 50).map(ref => (
                  <DetectedReferenceCard key={ref.id} ref={ref} />
                ))}
                {filteredRefs.length > 50 && (
                  <div className="text-center py-2 text-xs text-text-muted">
                    Showing 50 of {filteredRefs.length} references
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {activeTab === 'manage' && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-4 gap-2 mb-3">
              <StatBox label="Total" value={stats.total} />
              <StatBox label="Valid" value={stats.valid} color="green" />
              <StatBox label="Broken" value={stats.broken} color="red" />
              <StatBox label="Pending" value={stats.pending} color="amber" />
            </div>

            {/* Links list */}
            {hyperlinks.length === 0 ? (
              <div className="text-center py-8 text-text-muted text-sm">
                No hyperlinks created yet. Use the Detect tab to find and create links.
              </div>
            ) : (
              <div className="space-y-2">
                {hyperlinks.map(link => (
                  <HyperlinkCard 
                    key={link.id} 
                    link={link} 
                    onDelete={() => handleDeleteLink(link.id)}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === 'validate' && (
          <>
            <button
              onClick={handleValidateLinks}
              disabled={hyperlinks.length === 0 || isProcessing}
              className="w-full mb-3 px-3 py-2 bg-accent-blue text-white text-sm font-medium rounded-lg hover:bg-accent-blue/90 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4" />
              )}
              Validate All Links
            </button>

            {validationResults.length > 0 && (
              <>
                {/* Summary */}
                <div className="mb-3 p-3 bg-surface-card rounded-lg border border-border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-text-primary">Validation Results</span>
                    <span className="text-xs text-text-muted">{validationResults.length} links checked</span>
                  </div>
                  <div className="flex gap-4 text-xs">
                    <span className="text-accent-green">
                      ✓ {validationResults.filter(r => r.status === 'valid').length} valid
                    </span>
                    <span className="text-accent-red">
                      ✗ {validationResults.filter(r => r.status === 'broken').length} broken
                    </span>
                    <span className="text-accent-amber">
                      ⚠ {validationResults.filter(r => r.status === 'warning').length} warnings
                    </span>
                  </div>
                </div>

                {/* Broken links */}
                {validationResults.filter(r => r.status !== 'valid').length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs font-medium text-text-muted uppercase tracking-wider">
                      Issues Found
                    </div>
                    {validationResults
                      .filter(r => r.status !== 'valid')
                      .map(result => (
                        <div
                          key={result.linkId}
                          className={`p-2 rounded-lg border ${
                            result.status === 'broken' 
                              ? 'bg-accent-red/10 border-accent-red/30' 
                              : 'bg-accent-amber/10 border-accent-amber/30'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {result.status === 'broken' ? (
                              <XCircle className="w-4 h-4 text-accent-red" />
                            ) : (
                              <AlertTriangle className="w-4 h-4 text-accent-amber" />
                            )}
                            <span className="text-sm text-text-primary">{result.message}</span>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Sub-components
function DetectedReferenceCard({ ref }: { ref: DetectedReference }) {
  return (
    <div className="p-2 bg-surface-card rounded-lg border border-border">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`px-1.5 py-0.5 text-xs font-medium rounded ${getTypeColor(ref.type)}`}>
              {ref.type}
            </span>
            <span className="text-sm font-medium text-text-primary truncate">
              {ref.text}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1 text-xs text-text-muted">
            <span>Page {ref.sourcePage}</span>
            <span>•</span>
            <span className={ref.confidence >= 80 ? 'text-accent-green' : ref.confidence >= 60 ? 'text-accent-amber' : 'text-text-muted'}>
              {ref.confidence}% confidence
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {ref.status === 'linked' ? (
            <CheckCircle className="w-4 h-4 text-accent-green" />
          ) : ref.status === 'broken' ? (
            <XCircle className="w-4 h-4 text-accent-red" />
          ) : ref.suggestedTarget ? (
            <Link2 className="w-4 h-4 text-text-muted" />
          ) : null}
        </div>
      </div>
      {ref.suggestedTarget && ref.status !== 'linked' && (
        <div className="mt-2 p-1.5 bg-surface rounded text-xs text-text-secondary flex items-center gap-1">
          <ExternalLink className="w-3 h-3" />
          {ref.suggestedTarget.documentTitle || ref.suggestedTarget.section || ref.suggestedTarget.anchorText || 'Target'}
        </div>
      )}
    </div>
  );
}

function HyperlinkCard({ link, onDelete }: { link: Hyperlink; onDelete: () => void }) {
  return (
    <div className="p-2 bg-surface-card rounded-lg border border-border">
      <div className="flex items-center justify-between">
        <span className="text-sm text-text-primary truncate flex-1">
          {link.sourceText}
        </span>
        <div className="flex items-center gap-1 ml-2">
          {link.status === 'valid' && <CheckCircle className="w-4 h-4 text-accent-green" />}
          {link.status === 'broken' && <XCircle className="w-4 h-4 text-accent-red" />}
          {link.status === 'pending' && <Clock className="w-4 h-4 text-text-muted" />}
          <button
            onClick={onDelete}
            className="p-1 hover:bg-surface rounded text-text-muted hover:text-accent-red transition-colors"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>
      <div className="text-xs text-text-muted mt-1 flex items-center gap-1">
        <span>Page {link.sourcePage}</span>
        <span>→</span>
        <span>{link.target.documentTitle || link.target.type}</span>
      </div>
    </div>
  );
}

function StatBox({ label, value, color }: { label: string; value: number; color?: 'green' | 'red' | 'amber' }) {
  const colorClass = color === 'green' ? 'text-accent-green' : color === 'red' ? 'text-accent-red' : color === 'amber' ? 'text-accent-amber' : 'text-text-primary';
  return (
    <div className="p-2 bg-surface-card rounded-lg border border-border text-center">
      <div className={`text-lg font-semibold ${colorClass}`}>{value}</div>
      <div className="text-xs text-text-muted">{label}</div>
    </div>
  );
}

function getTypeColor(type: string): string {
  const colors: Record<string, string> = {
    study: 'bg-purple-500/20 text-purple-400',
    table: 'bg-blue-500/20 text-blue-400',
    figure: 'bg-green-500/20 text-green-400',
    section: 'bg-amber-500/20 text-amber-400',
    appendix: 'bg-cyan-500/20 text-cyan-400',
    reference: 'bg-pink-500/20 text-pink-400',
    module: 'bg-indigo-500/20 text-indigo-400',
  };
  return colors[type] || 'bg-gray-500/20 text-gray-400';
}

function generateMockContent(doc: ECTDDocument): string {
  // Generate realistic mock content based on document type
  const studyRefs = ['Study ABC-123-001', 'Study XYZ-456', 'Protocol DEF-789-002'];
  const tableRefs = ['Table 1', 'Table 2.1', 'Table 3.1a', 'Table IV'];
  const figureRefs = ['Figure 1', 'Figure 2.3', 'Fig. 5'];
  const sectionRefs = ['Section 2.7.1', 'Section 2.7.4', 'Module 5.3.5', '2.7.6'];
  const appendixRefs = ['Appendix A', 'Appendix B.1', 'Appendix 1'];
  const literatureRefs = ['[1]', '[2-5]', '(Smith et al., 2023)', '(Jones 2022)'];

  const parts = [
    `This ${doc.title} document provides comprehensive information.`,
    doc.module === 'm2' ? `Refer to ${studyRefs.join(', ')} for clinical data.` : '',
    `See ${tableRefs.slice(0, 2).join(' and ')} for summary statistics.`,
    `${figureRefs[0]} illustrates the primary endpoint results.`,
    `Additional details in ${sectionRefs.slice(0, 2).join(' and ')}.`,
    doc.module === 'm5' ? `Study datasets are provided in ${appendixRefs[0]}.` : '',
    `References: ${literatureRefs.slice(0, 3).join(', ')}.`,
  ];

  return parts.filter(Boolean).join('\n\n');
}
