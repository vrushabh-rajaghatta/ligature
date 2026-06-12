
/**
 * E2B(R3) XML Preview Panel
 * Displays generated XML with syntax highlighting, validation status, and export options
 * 
 * Phase 2.1e-3: XML Preview Integration
 * Version: 0.13.31
 */


import { useState, useCallback, useEffect, useRef } from 'react';
import { 
  FileCode, Download, Copy, CheckCircle, AlertTriangle, 
  Loader2, RefreshCw, X, Check, ChevronDown, ChevronUp,
  Maximize2, Minimize2
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import type { E2BFormState } from '@/lib/safety-api';

// =============================================================================
// TYPES
// =============================================================================

interface XMLPreviewPanelProps {
  /** E2B form state to generate XML from */
  formState: E2BFormState;
  /** Whether the panel is visible */
  isOpen: boolean;
  /** Close handler */
  onClose: () => void;
  /** Sender identifier */
  senderId?: string;
  /** Receiver identifier */
  receiverId?: string;
  /** Case number for file naming */
  caseNumber?: string;
}

interface GenerateXMLResponse {
  success: boolean;
  xml: string;
  messageId: string;
  safetyReportId: string;
  generatedAt: string;
  validationWarnings: string[];
  byteSize: number;
}

interface ValidationResponse {
  success: boolean;
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// =============================================================================
// XML SYNTAX HIGHLIGHTER
// =============================================================================

function highlightXML(xml: string): string {
  // Simple XML syntax highlighting
  return xml
    // Comments
    .replace(/(<!--[\s\S]*?-->)/g, '<span class="text-slate-500">$1</span>')
    // XML declaration
    .replace(/(<\?xml[^?]*\?>)/g, '<span class="text-purple-400">$1</span>')
    // Closing tags
    .replace(/(<\/[a-zA-Z][a-zA-Z0-9_-]*>)/g, '<span class="text-cyan-400">$1</span>')
    // Opening tags with attributes
    .replace(/(<[a-zA-Z][a-zA-Z0-9_-]*)(\s+[^>]*)(>)/g, 
      '<span class="text-cyan-400">$1</span><span class="text-yellow-300">$2</span><span class="text-cyan-400">$3</span>')
    // Self-closing and simple opening tags
    .replace(/(<[a-zA-Z][a-zA-Z0-9_-]*>)/g, '<span class="text-cyan-400">$1</span>')
    // Self-closing tags
    .replace(/(<[a-zA-Z][a-zA-Z0-9_-]*\s*\/>)/g, '<span class="text-cyan-400">$1</span>');
}

// =============================================================================
// COMPONENT
// =============================================================================

export function XMLPreviewPanel({
  formState,
  isOpen,
  onClose,
  senderId = 'LIGATURE',
  receiverId = 'FDA',
  caseNumber,
}: XMLPreviewPanelProps) {
  // State
  const [isLoading, setIsLoading] = useState(false);
  const [xmlResult, setXmlResult] = useState<GenerateXMLResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showWarnings, setShowWarnings] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const preRef = useRef<HTMLPreElement>(null);

  // Generate XML on mount or when form changes
  const generateXML = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/safety/e2b-xml', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formState,
          senderId,
          receiverId,
          includeHeader: true,
          prettyPrint: true,
          validate: true,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.errors) {
          setError(`Validation failed:\n${data.errors.join('\n')}`);
        } else {
          setError(data.error || 'Failed to generate XML');
        }
        return;
      }

      setXmlResult(data as GenerateXMLResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate XML');
    } finally {
      setIsLoading(false);
    }
  }, [formState, senderId, receiverId]);

  // Generate on open
  useEffect(() => {
    if (isOpen && !xmlResult && !isLoading) {
      generateXML();
    }
  }, [isOpen, xmlResult, isLoading, generateXML]);

  // Reset when closed
  useEffect(() => {
    if (!isOpen) {
      setXmlResult(null);
      setError(null);
      setCopied(false);
    }
  }, [isOpen]);

  // Copy to clipboard
  const handleCopy = useCallback(async () => {
    if (!xmlResult?.xml) return;
    
    try {
      await navigator.clipboard.writeText(xmlResult.xml);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [xmlResult?.xml]);

  // Download XML file
  const handleDownload = useCallback(() => {
    if (!xmlResult?.xml) return;
    
    const filename = caseNumber 
      ? `${caseNumber}-e2b.xml`
      : `e2b-${xmlResult.safetyReportId}.xml`;
    
    const blob = new Blob([xmlResult.xml], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [xmlResult, caseNumber]);

  // Format file size
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (!isOpen) return null;

  return (
    <Modal 
      isOpen={isOpen} 
      title="E2B(R3) XML Preview" 
      onClose={onClose}
      size={isExpanded ? 'full' : 'lg'}
    >
      <div className="flex flex-col h-full">
        {/* Header with metadata */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent-purple/20 flex items-center justify-center">
              <FileCode className="w-5 h-5 text-accent-purple" />
            </div>
            <div>
              <h3 className="font-semibold text-text-primary">ICH E2B(R3) ICSR</h3>
              <p className="text-xs text-text-muted">
                {xmlResult ? (
                  <>
                    {formatSize(xmlResult.byteSize)} • Generated {new Date(xmlResult.generatedAt).toLocaleTimeString()}
                  </>
                ) : (
                  'Generating...'
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 hover:bg-surface-card rounded-lg text-text-muted hover:text-text-primary transition-colors"
              title={isExpanded ? 'Collapse' : 'Expand'}
            >
              {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Validation Status */}
        {xmlResult && xmlResult.validationWarnings.length > 0 && (
          <div className="mb-4">
            <button
              onClick={() => setShowWarnings(!showWarnings)}
              className="w-full flex items-center justify-between p-3 bg-accent-amber/10 border border-accent-amber/30 rounded-lg text-left"
            >
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-accent-amber" />
                <span className="text-sm font-medium text-accent-amber">
                  {xmlResult.validationWarnings.length} Validation Warning{xmlResult.validationWarnings.length > 1 ? 's' : ''}
                </span>
              </div>
              {showWarnings ? <ChevronUp className="w-4 h-4 text-accent-amber" /> : <ChevronDown className="w-4 h-4 text-accent-amber" />}
            </button>
            {showWarnings && (
              <div className="mt-2 p-3 bg-surface-card rounded-lg border border-border">
                <ul className="space-y-1">
                  {xmlResult.validationWarnings.map((warning, idx) => (
                    <li key={idx} className="text-sm text-text-muted flex items-start gap-2">
                      <span className="text-accent-amber">•</span>
                      {warning}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Success Status */}
        {xmlResult && xmlResult.validationWarnings.length === 0 && (
          <div className="mb-4 flex items-center gap-2 p-3 bg-accent-green/10 border border-accent-green/30 rounded-lg">
            <CheckCircle className="w-4 h-4 text-accent-green" />
            <span className="text-sm text-accent-green font-medium">XML validates against ICH E2B(R3) schema</span>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex-1 flex flex-col items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-accent-purple animate-spin mb-4" />
            <p className="text-sm text-text-muted">Generating E2B(R3) XML...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="flex-1 flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 rounded-full bg-accent-red/10 flex items-center justify-center mb-4">
              <X className="w-8 h-8 text-accent-red" />
            </div>
            <p className="text-sm text-text-primary font-medium mb-2">XML Generation Failed</p>
            <pre className="text-xs text-accent-red whitespace-pre-wrap max-w-md text-center mb-4">
              {error}
            </pre>
            <Button variant="secondary" onClick={generateXML}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </div>
        )}

        {/* XML Preview */}
        {xmlResult && !error && (
          <div className={`flex-1 bg-slate-900 rounded-lg overflow-hidden flex flex-col ${isExpanded ? 'max-h-[70vh]' : 'max-h-96'}`}>
            {/* Line numbers + content */}
            <div className="flex-1 overflow-auto">
              <pre
                ref={preRef}
                className="p-4 text-xs font-mono leading-relaxed"
                dangerouslySetInnerHTML={{ 
                  __html: highlightXML(xmlResult.xml)
                    .split('\n')
                    .map((line, i) => 
                      `<div class="flex"><span class="w-10 text-right pr-4 text-slate-600 select-none">${i + 1}</span><span class="flex-1">${line || ' '}</span></div>`
                    )
                    .join('')
                }}
              />
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="mt-4 flex items-center justify-between pt-4 border-t border-border">
          <div className="flex items-center gap-2 text-xs text-text-muted">
            {xmlResult && (
              <>
                <Badge color="purple" size="sm">Message: {xmlResult.messageId.slice(0, 8)}...</Badge>
                <Badge color="blue" size="sm">Report: {xmlResult.safetyReportId.slice(0, 8)}...</Badge>
              </>
            )}
          </div>
          <div className="flex items-center gap-3">
            {xmlResult && (
              <>
                <Button variant="secondary" onClick={handleCopy} disabled={!xmlResult}>
                  {copied ? <Check className="w-4 h-4 mr-2 text-accent-green" /> : <Copy className="w-4 h-4 mr-2" />}
                  {copied ? 'Copied!' : 'Copy XML'}
                </Button>
                <Button variant="secondary" onClick={handleDownload} disabled={!xmlResult}>
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
              </>
            )}
            <Button variant="primary" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default XMLPreviewPanel;
