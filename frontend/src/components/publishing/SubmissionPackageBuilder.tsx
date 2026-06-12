

import React, { useState, useCallback, useEffect } from 'react';
import {
  Package,
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
  FolderOpen,
  File,
  Archive,
  Shield,
  Clock,
  Loader2,
  ExternalLink,
  Info,
} from 'lucide-react';
import {
  PackageCompilationRequest,
  PackageCompilationResult,
  PackageDocument,
  FolderNode,
  DocumentChecksum,
} from '@/services/ectd-package-compiler';

// ============================================================================
// TYPES
// ============================================================================

interface SubmissionPackageBuilderProps {
  documents?: Array<{
    id: string;
    title: string;
    fileName?: string;
    fileSize?: number;
    moduleNumber: string;
    sectionNumber: string;
    operation?: 'new' | 'replace' | 'append' | 'delete';
  }>;
  submissionInfo?: {
    applicationNumber?: string;
    applicationType?: string;
    sequenceNumber?: string;
    companyName?: string;
    productName?: string;
    submissionType?: string;
    region?: string;
    description?: string;
  };
  onCompileComplete?: (result: PackageCompilationResult) => void;
}

type CompilationState = 
  | 'idle'
  | 'preparing'
  | 'compiling'
  | 'validating'
  | 'complete'
  | 'error';

// ============================================================================
// COMPONENT
// ============================================================================

export function SubmissionPackageBuilder({
  documents = [],
  submissionInfo = {},
  onCompileComplete,
}: SubmissionPackageBuilderProps) {
  // State
  const [state, setState] = useState<CompilationState>('idle');
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<PackageCompilationResult | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showStructure, setShowStructure] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'structure' | 'checksums' | 'xml'>('overview');
  const [copied, setCopied] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  // Form state
  const [config, setConfig] = useState({
    applicationNumber: submissionInfo.applicationNumber || '',
    applicationType: submissionInfo.applicationType || 'NDA',
    sequenceNumber: submissionInfo.sequenceNumber || '0000',
    submissionType: submissionInfo.submissionType || 'original',
    region: (submissionInfo.region || 'us') as 'us' | 'eu' | 'jp' | 'ca' | 'cn',
    ectdVersion: '3.2.2' as '3.2.2' | '4.0',
    companyName: submissionInfo.companyName || '',
    productName: submissionInfo.productName || '',
    description: submissionInfo.description || '',
  });

  // Compile submission
  const handleCompile = useCallback(async () => {
    setState('preparing');
    setProgress(0);
    setResult(null);

    try {
      // Prepare documents
      const packageDocs: PackageDocument[] = documents.map(doc => ({
        id: doc.id,
        title: doc.title,
        fileName: doc.fileName || `${doc.title.toLowerCase().replace(/\s+/g, '-')}.pdf`,
        fileSize: doc.fileSize || 100 * 1024,
        moduleNumber: doc.moduleNumber,
        sectionNumber: doc.sectionNumber,
        operation: doc.operation || 'new',
      }));

      setState('compiling');
      setProgress(25);

      // Build request
      const request: PackageCompilationRequest = {
        projectId: `pkg-${Date.now()}`,
        ...config,
        documents: packageDocs,
      };

      // Call API
      const response = await fetch('/api/submissions/compile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });

      setState('validating');
      setProgress(75);

      const compilationResult: PackageCompilationResult = await response.json();
      
      setProgress(100);
      setState(compilationResult.success ? 'complete' : 'error');
      setResult(compilationResult);

      // Expand root folder by default
      if (compilationResult.manifest?.folderStructure) {
        setExpandedFolders(new Set([compilationResult.manifest.folderStructure.path]));
      }

      onCompileComplete?.(compilationResult);
    } catch (error) {
      setState('error');
      setResult({
        success: false,
        packageId: '',
        fileName: '',
        fileSize: 0,
        checksum: '',
        checksumType: 'md5',
        manifest: {
          indexXml: '',
          folderStructure: { name: '', type: 'folder', path: '' },
          documentCount: 0,
          totalSize: 0,
          checksums: [],
        },
        errors: [{
          code: 'NETWORK_ERROR',
          message: error instanceof Error ? error.message : 'Failed to connect to compilation service',
          severity: 'error',
        }],
        compiledAt: new Date().toISOString(),
        duration: 0,
      });
    }
  }, [documents, config, onCompileComplete]);

  // Download package
  const handleDownload = useCallback(async () => {
    if (!result?.packageId) return;

    try {
      const response = await fetch(result.downloadUrl || `/api/submissions/compile/download/${result.packageId}`);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = result.fileName.replace('.zip', '.json'); // Demo returns JSON
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
    }
  }, [result]);

  // Copy to clipboard
  const handleCopy = useCallback((content: string) => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  // Toggle folder expansion
  const toggleFolder = useCallback((path: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  // Render folder tree
  const renderFolderTree = useCallback((node: FolderNode, depth: number = 0): React.JSX.Element => {
    const isExpanded = expandedFolders.has(node.path);
    const hasChildren = node.children && node.children.length > 0;
    
    return (
      <div key={node.path} style={{ marginLeft: depth * 16 }}>
        <div 
          className={`flex items-center gap-1.5 py-1 px-1 rounded text-xs cursor-pointer hover:bg-surface-card ${
            node.type === 'file' ? 'text-text-secondary' : 'text-text-primary'
          }`}
          onClick={() => node.type === 'folder' && hasChildren && toggleFolder(node.path)}
        >
          {node.type === 'folder' ? (
            <>
              {hasChildren && (
                isExpanded 
                  ? <ChevronDown className="w-3 h-3 text-text-muted" />
                  : <ChevronRight className="w-3 h-3 text-text-muted" />
              )}
              {!hasChildren && <span className="w-3" />}
              {isExpanded 
                ? <FolderOpen className="w-4 h-4 text-accent-amber" />
                : <Folder className="w-4 h-4 text-accent-amber" />
              }
            </>
          ) : (
            <>
              <span className="w-3" />
              <File className="w-4 h-4 text-text-muted" />
            </>
          )}
          <span className="truncate">{node.name}</span>
          {node.size && (
            <span className="text-text-muted ml-auto">
              {(node.size / 1024).toFixed(0)}KB
            </span>
          )}
        </div>
        {node.type === 'folder' && isExpanded && node.children?.map(child => 
          renderFolderTree(child, depth + 1)
        )}
      </div>
    );
  }, [expandedFolders, toggleFolder]);

  // Get status badge
  const getStatusBadge = () => {
    switch (state) {
      case 'preparing':
        return (
          <div className="flex items-center gap-2 text-accent-blue">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Preparing documents...</span>
          </div>
        );
      case 'compiling':
        return (
          <div className="flex items-center gap-2 text-accent-blue">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Compiling package...</span>
          </div>
        );
      case 'validating':
        return (
          <div className="flex items-center gap-2 text-accent-amber">
            <Shield className="w-4 h-4" />
            <span className="text-sm">Validating structure...</span>
          </div>
        );
      case 'complete':
        return (
          <div className="flex items-center gap-2 text-accent-green">
            <CheckCircle className="w-4 h-4" />
            <span className="text-sm">Package ready</span>
          </div>
        );
      case 'error':
        return (
          <div className="flex items-center gap-2 text-accent-red">
            <XCircle className="w-4 h-4" />
            <span className="text-sm">Compilation failed</span>
          </div>
        );
      default:
        return null;
    }
  };

  // Module breakdown
  const moduleBreakdown = documents.reduce((acc, doc) => {
    const key = `M${doc.moduleNumber}`;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="flex flex-col h-full bg-surface">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-accent-blue" />
            <h3 className="font-semibold text-text-primary">Submission Package Builder</h3>
          </div>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-1.5 rounded-lg transition-colors ${
              showSettings ? 'bg-accent-blue/10 text-accent-blue' : 'hover:bg-surface-card text-text-muted'
            }`}
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-text-muted">
          Compile eCTD submission package with proper folder structure and checksums
        </p>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="p-4 border-b border-border bg-surface-card/50 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-text-muted mb-1">Application Number *</label>
              <input
                type="text"
                value={config.applicationNumber}
                onChange={e => setConfig(prev => ({ ...prev, applicationNumber: e.target.value }))}
                placeholder="NDA123456"
                className="w-full px-2 py-1.5 text-sm bg-surface border border-border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">Sequence Number *</label>
              <input
                type="text"
                value={config.sequenceNumber}
                onChange={e => setConfig(prev => ({ ...prev, sequenceNumber: e.target.value }))}
                placeholder="0001"
                className="w-full px-2 py-1.5 text-sm bg-surface border border-border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">Application Type</label>
              <select
                value={config.applicationType}
                onChange={e => setConfig(prev => ({ ...prev, applicationType: e.target.value }))}
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
                value={config.submissionType}
                onChange={e => setConfig(prev => ({ ...prev, submissionType: e.target.value }))}
                className="w-full px-2 py-1.5 text-sm bg-surface border border-border rounded-lg"
              >
                <option value="original">Original</option>
                <option value="amendment">Amendment</option>
                <option value="supplement">Supplement</option>
                <option value="annual-report">Annual Report</option>
                <option value="ir-response">IR Response</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">Region</label>
              <select
                value={config.region}
                onChange={e => setConfig(prev => ({ ...prev, region: e.target.value as typeof config.region }))}
                className="w-full px-2 py-1.5 text-sm bg-surface border border-border rounded-lg"
              >
                <option value="us">🇺🇸 US (FDA)</option>
                <option value="eu">🇪🇺 EU (EMA)</option>
                <option value="jp">🇯🇵 Japan (PMDA)</option>
                <option value="ca">🇨🇦 Canada (HC)</option>
                <option value="cn">🇨🇳 China (NMPA)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">eCTD Version</label>
              <select
                value={config.ectdVersion}
                onChange={e => setConfig(prev => ({ ...prev, ectdVersion: e.target.value as typeof config.ectdVersion }))}
                className="w-full px-2 py-1.5 text-sm bg-surface border border-border rounded-lg"
              >
                <option value="3.2.2">eCTD v3.2.2</option>
                <option value="4.0">eCTD v4.0 (FHIR)</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1">Company Name</label>
            <input
              type="text"
              value={config.companyName}
              onChange={e => setConfig(prev => ({ ...prev, companyName: e.target.value }))}
              placeholder="Acme Pharmaceuticals Inc."
              className="w-full px-2 py-1.5 text-sm bg-surface border border-border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1">Description</label>
            <input
              type="text"
              value={config.description}
              onChange={e => setConfig(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Initial NDA submission for Product X"
              className="w-full px-2 py-1.5 text-sm bg-surface border border-border rounded-lg"
            />
          </div>
        </div>
      )}

      {/* Document Summary */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-medium text-text-primary">
            Documents to Include
          </div>
          <div className="text-xs text-text-muted">
            {documents.length} document{documents.length !== 1 ? 's' : ''}
          </div>
        </div>
        
        {/* Module breakdown */}
        <div className="flex flex-wrap gap-2 mb-4">
          {Object.entries(moduleBreakdown).map(([module, count]) => (
            <span
              key={module}
              className={`px-2 py-1 text-xs rounded-lg ${
                module === 'M1' ? 'bg-red-500/10 text-red-400' :
                module === 'M2' ? 'bg-amber-500/10 text-amber-400' :
                module === 'M3' ? 'bg-green-500/10 text-green-400' :
                module === 'M4' ? 'bg-purple-500/10 text-purple-400' :
                'bg-blue-500/10 text-blue-400'
              }`}
            >
              {module}: {count}
            </span>
          ))}
          {documents.length === 0 && (
            <span className="text-xs text-text-muted italic">No documents assigned</span>
          )}
        </div>

        {/* Compile button */}
        <button
          onClick={handleCompile}
          disabled={state !== 'idle' && state !== 'complete' && state !== 'error' || documents.length === 0 || !config.applicationNumber}
          className="w-full px-4 py-2.5 bg-accent-blue text-white text-sm font-medium rounded-lg hover:bg-accent-blue/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
        >
          {state === 'idle' || state === 'complete' || state === 'error' ? (
            <>
              <Archive className="w-4 h-4" />
              Compile Submission Package
            </>
          ) : (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Compiling...
            </>
          )}
        </button>

        {/* Missing fields warning */}
        {!config.applicationNumber && (
          <p className="text-xs text-accent-amber mt-2 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            Application number is required
          </p>
        )}
      </div>

      {/* Progress bar */}
      {(state !== 'idle' && state !== 'complete' && state !== 'error') && (
        <div className="px-4 py-2 border-b border-border">
          <div className="h-1.5 bg-surface-card rounded-full overflow-hidden">
            <div 
              className="h-full bg-accent-blue transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between">
            {getStatusBadge()}
            <span className="text-xs text-text-muted">{progress}%</span>
          </div>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Status banner */}
          <div className={`px-4 py-3 ${result.success ? 'bg-accent-green/10' : 'bg-accent-red/10'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {result.success ? (
                  <CheckCircle className="w-5 h-5 text-accent-green" />
                ) : (
                  <XCircle className="w-5 h-5 text-accent-red" />
                )}
                <div>
                  <p className={`text-sm font-medium ${result.success ? 'text-accent-green' : 'text-accent-red'}`}>
                    {result.success ? 'Package compiled successfully' : 'Compilation failed'}
                  </p>
                  {result.success && (
                    <p className="text-xs text-text-muted mt-0.5">
                      {result.manifest.documentCount} documents • {(result.fileSize / 1024).toFixed(0)}KB • {result.duration}ms
                    </p>
                  )}
                </div>
              </div>
              {result.success && (
                <button
                  onClick={handleDownload}
                  className="px-3 py-1.5 bg-accent-green text-white text-sm font-medium rounded-lg hover:bg-accent-green/90 flex items-center gap-1.5"
                >
                  <Download className="w-4 h-4" />
                  Download Package
                </button>
              )}
            </div>
          </div>

          {/* Errors/Warnings */}
          {(result.errors?.length || result.warnings?.length) && (
            <div className="px-4 py-2 border-b border-border space-y-1">
              {result.errors?.map((err, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-accent-red">
                  <XCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                  <span>{err.message}</span>
                </div>
              ))}
              {result.warnings?.map((warn, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-accent-amber">
                  <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                  <span>{warn.message}</span>
                </div>
              ))}
            </div>
          )}

          {/* Tabs */}
          {result.success && (
            <>
              <div className="flex items-center gap-1 px-4 py-2 border-b border-border">
                {(['overview', 'structure', 'checksums', 'xml'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                      activeTab === tab
                        ? 'bg-accent-blue text-white'
                        : 'text-text-secondary hover:bg-surface-card'
                    }`}
                  >
                    {tab === 'overview' && 'Overview'}
                    {tab === 'structure' && 'Structure'}
                    {tab === 'checksums' && 'Checksums'}
                    {tab === 'xml' && 'index.xml'}
                  </button>
                ))}
                <div className="flex-1" />
                {activeTab === 'xml' && (
                  <button
                    onClick={() => handleCopy(result.manifest.indexXml)}
                    className="p-1.5 hover:bg-surface-card rounded text-text-muted"
                    title="Copy to clipboard"
                  >
                    {copied ? <CheckCircle className="w-4 h-4 text-accent-green" /> : <Copy className="w-4 h-4" />}
                  </button>
                )}
              </div>

              {/* Tab content */}
              <div className="flex-1 overflow-auto p-4">
                {activeTab === 'overview' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 bg-surface-card rounded-lg">
                        <div className="text-xs text-text-muted mb-1">Package ID</div>
                        <div className="text-sm font-mono text-text-primary">{result.packageId}</div>
                      </div>
                      <div className="p-3 bg-surface-card rounded-lg">
                        <div className="text-xs text-text-muted mb-1">File Name</div>
                        <div className="text-sm font-mono text-text-primary">{result.fileName}</div>
                      </div>
                      <div className="p-3 bg-surface-card rounded-lg">
                        <div className="text-xs text-text-muted mb-1">Checksum (MD5)</div>
                        <div className="text-sm font-mono text-text-primary truncate">{result.checksum}</div>
                      </div>
                      <div className="p-3 bg-surface-card rounded-lg">
                        <div className="text-xs text-text-muted mb-1">Compiled At</div>
                        <div className="text-sm text-text-primary">
                          {new Date(result.compiledAt).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-3 bg-surface-card rounded-lg">
                      <div className="text-xs text-text-muted mb-2">Module Summary</div>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(moduleBreakdown).map(([module, count]) => (
                          <div key={module} className="flex items-center gap-2 px-2 py-1 bg-surface rounded">
                            <span className="text-sm font-medium text-text-primary">{module}</span>
                            <span className="text-xs text-text-muted">{count} docs</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="p-3 bg-blue-500/10 rounded-lg flex items-start gap-2">
                      <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                      <div className="text-xs text-blue-300">
                        <p className="font-medium mb-1">Package Preview</p>
                        <p>
                          This package structure is generated as a preview. The production download will contain 
                          properly formatted PDF documents in a ZIP archive ready for gateway submission.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'structure' && (
                  <div className="bg-surface-card rounded-lg p-3 overflow-auto">
                    {result.manifest.folderStructure && 
                      renderFolderTree(result.manifest.folderStructure)
                    }
                  </div>
                )}

                {activeTab === 'checksums' && (
                  <div className="space-y-2">
                    {result.manifest.checksums.map(chk => (
                      <div key={chk.documentId} className="p-3 bg-surface-card rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-text-primary">{chk.fileName}</span>
                          <span className="text-xs text-text-muted">{(chk.fileSize / 1024).toFixed(0)}KB</span>
                        </div>
                        <div className="text-xs text-text-muted mb-1">{chk.relativePath}</div>
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          <div>
                            <span className="text-xs text-text-muted">MD5: </span>
                            <span className="text-xs font-mono text-text-secondary">{chk.md5}</span>
                          </div>
                          <div>
                            <span className="text-xs text-text-muted">SHA-256: </span>
                            <span className="text-xs font-mono text-text-secondary truncate">{chk.sha256.slice(0, 24)}...</span>
                          </div>
                        </div>
                      </div>
                    ))}
                    {result.manifest.checksums.length === 0 && (
                      <p className="text-sm text-text-muted italic">No checksums generated</p>
                    )}
                  </div>
                )}

                {activeTab === 'xml' && (
                  <pre className="text-xs font-mono text-text-secondary bg-surface-card p-4 rounded-lg overflow-auto whitespace-pre-wrap">
                    {result.manifest.indexXml || 'No index.xml generated'}
                  </pre>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Empty state */}
      {state === 'idle' && !result && (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center">
            <Archive className="w-12 h-12 text-text-muted mx-auto mb-3" />
            <p className="text-sm text-text-muted">
              Configure settings and click "Compile" to create a submission package
            </p>
            <p className="text-xs text-text-muted mt-2">
              The package will include index.xml, checksums, and proper eCTD folder structure
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default SubmissionPackageBuilder;
