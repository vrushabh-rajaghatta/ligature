

import { useState, useCallback } from 'react';
import {
  Code,
  Play,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Download,
  ChevronDown,
  ChevronRight,
  FileCode,
  Copy,
  Eye,
  Settings,
  Folder,
} from 'lucide-react';
import {
  ectdBackboneGenerator,
  BackboneFiles,
  SubmissionEnvelope,
  RegionalInfo,
  StudyTaggingInfo,
} from '@/services/ectd-backbone-generator';
import { ECTDDocument } from '@/types/ectd';

interface BackboneGeneratorPanelProps {
  documents: ECTDDocument[];
  submissionInfo?: {
    applicationNumber?: string;
    applicationType?: string;
    sequenceNumber?: string;
    companyName?: string;
  };
}

export function BackboneGeneratorPanel({ documents, submissionInfo }: BackboneGeneratorPanelProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [backboneFiles, setBackboneFiles] = useState<BackboneFiles | null>(null);
  const [validation, setValidation] = useState<{ isValid: boolean; errors: string[]; warnings: string[] } | null>(null);
  const [activePreview, setActivePreview] = useState<'index' | 'regional' | 'checksums' | null>('index');
  const [showSettings, setShowSettings] = useState(false);
  const [copied, setCopied] = useState(false);

  // Form state for envelope
  const [envelope, setEnvelope] = useState<SubmissionEnvelope>({
    submissionId: `SUB-${Date.now()}`,
    sequenceNumber: submissionInfo?.sequenceNumber || '0000',
    submissionType: 'original',
    applicationType: submissionInfo?.applicationType || 'NDA',
    applicationNumber: submissionInfo?.applicationNumber || '',
    companyName: submissionInfo?.companyName || '',
  });

  const [regional, setRegional] = useState<RegionalInfo>({
    region: 'us',
    productName: '',
    manufacturerName: '',
  });

  const handleGenerate = useCallback(async () => {
    setIsProcessing(true);
    try {
      // Clear previous state
      ectdBackboneGenerator.clear();

      // Generate backbone
      const files = await ectdBackboneGenerator.generateBackbone(
        envelope,
        documents,
        regional.region !== 'us' || regional.productName ? regional : undefined,
        [] // studies - could be populated from submission data
      );

      setBackboneFiles(files);

      // Validate
      const validationResult = ectdBackboneGenerator.validateBackbone(files);
      setValidation(validationResult);
      setActivePreview('index');
    } finally {
      setIsProcessing(false);
    }
  }, [envelope, regional, documents]);

  const handleDownload = useCallback((filename: string, content: string) => {
    const blob = new Blob([content], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const handleCopy = useCallback((content: string) => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  const handleDownloadAll = useCallback(() => {
    if (!backboneFiles) return;

    // In a real app, would create a zip file
    handleDownload('index.xml', backboneFiles.indexXml);
    if (backboneFiles.regionalXml) {
      handleDownload(`${regional.region}-regional.xml`, backboneFiles.regionalXml);
    }
    handleDownload('checksums.txt', backboneFiles.checksumFile);
    backboneFiles.stfFiles.forEach(stf => {
      handleDownload(stf.filename, stf.content);
    });
  }, [backboneFiles, regional.region, handleDownload]);

  const getPreviewContent = () => {
    if (!backboneFiles) return '';
    switch (activePreview) {
      case 'index': return backboneFiles.indexXml;
      case 'regional': return backboneFiles.regionalXml || 'No regional XML generated';
      case 'checksums': return backboneFiles.checksumFile;
      default: return '';
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Code className="w-5 h-5 text-accent-blue" />
            <h3 className="font-semibold text-text-primary">Backbone Generator</h3>
          </div>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-1.5 rounded-lg transition-colors ${showSettings ? 'bg-accent-blue/10 text-accent-blue' : 'hover:bg-surface-card text-text-muted'}`}
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-text-muted">
          Generate index.xml, regional XML, STF files, and checksums
        </p>
      </div>

      {/* Settings / Envelope form */}
      {showSettings && (
        <div className="p-3 border-b border-border bg-surface-card/50 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-text-muted mb-1">Application Number</label>
              <input
                type="text"
                value={envelope.applicationNumber}
                onChange={(e) => setEnvelope(prev => ({ ...prev, applicationNumber: e.target.value }))}
                placeholder="NDA123456"
                className="w-full px-2 py-1.5 text-sm bg-surface border border-border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">Sequence Number</label>
              <input
                type="text"
                value={envelope.sequenceNumber}
                onChange={(e) => setEnvelope(prev => ({ ...prev, sequenceNumber: e.target.value }))}
                placeholder="0000"
                className="w-full px-2 py-1.5 text-sm bg-surface border border-border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">Application Type</label>
              <select
                value={envelope.applicationType}
                onChange={(e) => setEnvelope(prev => ({ ...prev, applicationType: e.target.value }))}
                className="w-full px-2 py-1.5 text-sm bg-surface border border-border rounded-lg"
              >
                <option value="NDA">NDA</option>
                <option value="BLA">BLA</option>
                <option value="ANDA">ANDA</option>
                <option value="IND">IND</option>
                <option value="NDA-SUPPL">NDA Supplement</option>
                <option value="BLA-SUPPL">BLA Supplement</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">Submission Type</label>
              <select
                value={envelope.submissionType}
                onChange={(e) => setEnvelope(prev => ({ ...prev, submissionType: e.target.value }))}
                className="w-full px-2 py-1.5 text-sm bg-surface border border-border rounded-lg"
              >
                <option value="original">Original</option>
                <option value="amendment">Amendment</option>
                <option value="supplement">Supplement</option>
                <option value="annual-report">Annual Report</option>
                <option value="correspondence">Correspondence</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1">Company Name</label>
            <input
              type="text"
              value={envelope.companyName}
              onChange={(e) => setEnvelope(prev => ({ ...prev, companyName: e.target.value }))}
              placeholder="Acme Pharmaceuticals Inc."
              className="w-full px-2 py-1.5 text-sm bg-surface border border-border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1">Region</label>
            <select
              value={regional.region}
              onChange={(e) => setRegional(prev => ({ ...prev, region: e.target.value as RegionalInfo['region'] }))}
              className="w-full px-2 py-1.5 text-sm bg-surface border border-border rounded-lg"
            >
              <option value="us">🇺🇸 US (FDA)</option>
              <option value="eu">🇪🇺 EU (EMA)</option>
              <option value="ca">🇨🇦 Canada (HC)</option>
              <option value="jp">🇯🇵 Japan (PMDA)</option>
              <option value="au">🇦🇺 Australia (TGA)</option>
            </select>
          </div>
        </div>
      )}

      {/* Generate button */}
      <div className="p-3 border-b border-border">
        <button
          onClick={handleGenerate}
          disabled={isProcessing || documents.length === 0}
          className="w-full px-3 py-2 bg-accent-blue text-white text-sm font-medium rounded-lg hover:bg-accent-blue/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isProcessing ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Play className="w-4 h-4" />
          )}
          Generate Backbone ({documents.length} docs)
        </button>

        {/* Document count by module */}
        <div className="flex gap-2 mt-2 text-xs text-text-muted">
          {['m1', 'm2', 'm3', 'm4', 'm5'].map(mod => {
            const count = documents.filter(d => d.module === mod).length;
            return count > 0 ? (
              <span key={mod} className="px-1.5 py-0.5 bg-surface-card rounded">
                {mod.toUpperCase()}: {count}
              </span>
            ) : null;
          })}
        </div>
      </div>

      {/* Validation status */}
      {validation && (
        <div className={`p-3 border-b border-border ${validation.isValid ? 'bg-accent-green/10' : 'bg-accent-red/10'}`}>
          <div className="flex items-center gap-2 mb-1">
            {validation.isValid ? (
              <CheckCircle className="w-4 h-4 text-accent-green" />
            ) : (
              <XCircle className="w-4 h-4 text-accent-red" />
            )}
            <span className={`text-sm font-medium ${validation.isValid ? 'text-accent-green' : 'text-accent-red'}`}>
              {validation.isValid ? 'Backbone is valid' : 'Validation errors found'}
            </span>
          </div>
          {validation.errors.length > 0 && (
            <ul className="text-xs text-accent-red ml-6 list-disc">
              {validation.errors.map((err, i) => <li key={i}>{err}</li>)}
            </ul>
          )}
          {validation.warnings.length > 0 && (
            <ul className="text-xs text-accent-amber ml-6 list-disc">
              {validation.warnings.map((warn, i) => <li key={i}>{warn}</li>)}
            </ul>
          )}
        </div>
      )}

      {/* Generated files preview */}
      {backboneFiles && (
        <>
          {/* File tabs */}
          <div className="flex items-center gap-1 p-2 border-b border-border">
            <button
              onClick={() => setActivePreview('index')}
              className={`px-2 py-1 text-xs rounded-lg transition-colors flex items-center gap-1 ${
                activePreview === 'index'
                  ? 'bg-accent-blue text-white'
                  : 'text-text-secondary hover:bg-surface-card'
              }`}
            >
              <FileCode className="w-3 h-3" />
              index.xml
            </button>
            {backboneFiles.regionalXml && (
              <button
                onClick={() => setActivePreview('regional')}
                className={`px-2 py-1 text-xs rounded-lg transition-colors flex items-center gap-1 ${
                  activePreview === 'regional'
                    ? 'bg-accent-blue text-white'
                    : 'text-text-secondary hover:bg-surface-card'
                }`}
              >
                <FileCode className="w-3 h-3" />
                {regional.region}-regional.xml
              </button>
            )}
            <button
              onClick={() => setActivePreview('checksums')}
              className={`px-2 py-1 text-xs rounded-lg transition-colors flex items-center gap-1 ${
                activePreview === 'checksums'
                  ? 'bg-accent-blue text-white'
                  : 'text-text-secondary hover:bg-surface-card'
              }`}
            >
              <FileCode className="w-3 h-3" />
              checksums.txt
            </button>
            
            <div className="flex-1" />
            
            <button
              onClick={() => handleCopy(getPreviewContent())}
              className="p-1.5 hover:bg-surface-card rounded text-text-muted"
              title="Copy to clipboard"
            >
              {copied ? <CheckCircle className="w-4 h-4 text-accent-green" /> : <Copy className="w-4 h-4" />}
            </button>
            <button
              onClick={handleDownloadAll}
              className="p-1.5 hover:bg-surface-card rounded text-text-muted"
              title="Download all files"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>

          {/* Preview content */}
          <div className="flex-1 overflow-auto p-3">
            <pre className="text-xs font-mono text-text-secondary bg-surface p-3 rounded-lg overflow-auto whitespace-pre-wrap">
              {getPreviewContent()}
            </pre>
          </div>

          {/* STF files */}
          {backboneFiles.stfFiles.length > 0 && (
            <div className="p-3 border-t border-border">
              <div className="text-xs font-medium text-text-muted mb-2">
                Study Tagging Files ({backboneFiles.stfFiles.length})
              </div>
              <div className="flex flex-wrap gap-2">
                {backboneFiles.stfFiles.map(stf => (
                  <button
                    key={stf.filename}
                    onClick={() => handleDownload(stf.filename, stf.content)}
                    className="px-2 py-1 text-xs bg-surface-card rounded-lg border border-border hover:border-accent-blue flex items-center gap-1"
                  >
                    <FileCode className="w-3 h-3" />
                    {stf.filename}
                    <Download className="w-3 h-3 text-text-muted" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Empty state */}
      {!backboneFiles && (
        <div className="flex-1 flex items-center justify-center p-6 text-center">
          <div>
            <Folder className="w-12 h-12 text-text-muted mx-auto mb-3" />
            <p className="text-sm text-text-muted">
              Configure settings and click "Generate Backbone" to create eCTD XML files
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
