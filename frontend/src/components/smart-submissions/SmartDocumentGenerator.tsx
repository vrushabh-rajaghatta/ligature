
/**
 * SmartDocumentGenerator - v0.34.4
 * 
 * UI component for generating FDA-compliant hybrid documents with:
 * - Human-readable PDF layer
 * - Machine-readable embedded data (JSON-LD, FHIR)
 * - SCA tags linking text to source data
 * - CQI metadata headers
 */

import { useState, useCallback, useMemo } from 'react';
import {
  FileText, Download, Database, Link2, Cpu, CheckCircle2,
  Loader2, Sparkles, Layers, Code, FileJson, AlertCircle,
  ChevronDown, ChevronUp, ExternalLink, Package,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';

interface SmartDocumentGeneratorProps {
  // Document context
  documentType: 'cmc-quality' | 'clinical-summary' | 'safety-summary' | 'nonclinical' | 'labeling';
  productId: string;
  productName: string;
  substanceName: string;
  applicationNumber: string;
  ctdModule: string;
  ctdSection: string;
  
  // Content to include
  sections: {
    id: string;
    sectionNumber: string;
    title: string;
    content: string;
    dataReferences?: {
      textMarker: string;
      dataPath: string;
      urn: string;
    }[];
  }[];
  
  // Structured data record types
  // These are flexible records with known optional properties
  specifications?: Array<Record<string, unknown> & { id?: string; urn?: string }>;
  batchData?: Array<Record<string, unknown> & { id?: string; urn?: string; batchNumber?: string | number }>;
  stabilityData?: Array<Record<string, unknown> & { id?: string; urn?: string }>;
  safetySignals?: Array<Record<string, unknown> & { id?: string; urn?: string; meddraCode?: string | number }>;
  
  // Metadata
  author?: string;
  version?: string;
}

interface GenerationResult {
  pdf: string;  // base64
  structuredData: {
    jsonLD: Record<string, unknown>;
    fhirBundle: Record<string, unknown>;
  };
  metadata: {
    filename: string;
    jsonLDFilename: string;
    fhirFilename: string;
    generatedAt: string;
  };
}

export function SmartDocumentGenerator({
  documentType,
  productId,
  productName,
  substanceName,
  applicationNumber,
  ctdModule,
  ctdSection,
  sections,
  specifications,
  batchData,
  stabilityData,
  safetySignals,
  author = 'Ligature System',
  version = '1.0',
}: SmartDocumentGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingPdfA3, setIsGeneratingPdfA3] = useState(false);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showDataPreview, setShowDataPreview] = useState(false);
  
  // Memoize data to prevent render loops from unstable array references
  const stableSections = useMemo(() => sections || [], [JSON.stringify(sections)]);
  const stableSpecs = useMemo(() => specifications || [], [JSON.stringify(specifications)]);
  const stableBatches = useMemo(() => batchData || [], [JSON.stringify(batchData)]);
  const stableStability = useMemo(() => stabilityData || [], [JSON.stringify(stabilityData)]);
  const stableSafety = useMemo(() => safetySignals || [], [JSON.stringify(safetySignals)]);
  
  // Count data references
  const dataRefCount = stableSections.reduce((acc, s) => acc + (s.dataReferences?.length || 0), 0);
  const specCount = stableSpecs.length;
  const batchCount = stableBatches.length;
  
  const handleGenerate = useCallback(async () => {
    setIsGenerating(true);
    setError(null);
    
    try {
      const response = await fetch('/api/smart-submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentType,
          productId,
          productName,
          substanceName,
          applicationNumber,
          ctdModule,
          ctdSection,
          sections: stableSections.map(s => ({
            ...s,
            dataReferences: s.dataReferences || [],
          })),
          structuredData: {
            specifications: stableSpecs.map((spec, i) => ({
              ...spec,
              id: spec.id || `spec-${i}`,
              urn: spec.urn || `urn:ligature:spec:${productId}:${i}`,
            })),
            batchData: stableBatches.map((batch, i) => ({
              ...batch,
              id: batch.id || `batch-${i}`,
              urn: batch.urn || `urn:ligature:batch:${productId}:${batch.batchNumber || i}`,
            })),
            stabilityData: stableStability.map((stab, i) => ({
              ...stab,
              id: stab.id || `stab-${i}`,
              urn: stab.urn || `urn:ligature:stability:${productId}:${i}`,
            })),
            safetySignals: stableSafety.map((sig, i) => ({
              ...sig,
              id: sig.id || `sig-${i}`,
              urn: sig.urn || `urn:ligature:signal:${productId}:${sig.meddraCode || i}`,
            })),
          },
          author,
          version,
          effectiveDate: new Date().toISOString().split('T')[0],
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate smart document');
      }
      
      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setIsGenerating(false);
    }
  }, [documentType, productId, productName, substanceName, applicationNumber, ctdModule, ctdSection, stableSections, stableSpecs, stableBatches, stableStability, stableSafety, author, version]);
  
  const downloadPDF = useCallback(() => {
    if (!result) return;
    
    const byteCharacters = atob(result.pdf);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'application/pdf' });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = result.metadata.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [result]);
  
  const downloadJSON = useCallback((type: 'jsonLD' | 'fhir') => {
    if (!result) return;
    
    const data = type === 'jsonLD' ? result.structuredData.jsonLD : result.structuredData.fhirBundle;
    const filename = type === 'jsonLD' ? result.metadata.jsonLDFilename : result.metadata.fhirFilename;
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [result]);
  
  // v0.34.5: Generate PDF/A-3 with embedded attachments (all-in-one file)
  const handleGeneratePdfA3 = useCallback(async () => {
    setIsGeneratingPdfA3(true);
    setError(null);
    
    try {
      const response = await fetch('/api/smart-submissions/pdfa3', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentType,
          productId,
          productName,
          substanceName,
          applicationNumber,
          ctdModule,
          ctdSection,
          sections: stableSections.map(s => ({
            ...s,
            dataReferences: s.dataReferences || [],
          })),
          structuredData: {
            specifications: stableSpecs.map((spec, i) => ({
              ...spec,
              id: spec.id || `spec-${i}`,
              urn: spec.urn || `urn:ligature:spec:${productId}:${i}`,
            })),
            batchData: stableBatches.map((batch, i) => ({
              ...batch,
              id: batch.id || `batch-${i}`,
              urn: batch.urn || `urn:ligature:batch:${productId}:${batch.batchNumber || i}`,
            })),
            stabilityData: stableStability.map((stab, i) => ({
              ...stab,
              id: stab.id || `stab-${i}`,
              urn: stab.urn || `urn:ligature:stability:${productId}:${i}`,
            })),
            safetySignals: stableSafety.map((sig, i) => ({
              ...sig,
              id: sig.id || `sig-${i}`,
              urn: sig.urn || `urn:ligature:signal:${productId}:${sig.meddraCode || i}`,
            })),
          },
          author,
          version,
          effectiveDate: new Date().toISOString().split('T')[0],
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate PDF/A-3 document');
      }
      
      // Response is the PDF binary directly
      const blob = await response.blob();
      const filename = response.headers.get('Content-Disposition')?.match(/filename="(.+)"/)?.[1] 
        || `smart-pdfa3-${ctdSection}-${new Date().toISOString().split('T')[0]}.pdf`;
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'PDF/A-3 generation failed');
    } finally {
      setIsGeneratingPdfA3(false);
    }
  }, [documentType, productId, productName, substanceName, applicationNumber, ctdModule, ctdSection, stableSections, stableSpecs, stableBatches, stableStability, stableSafety, author, version]);

  return (
    <Card className="border-purple-500/30 bg-gradient-to-br from-purple-500/5 to-blue-500/5">
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start gap-3 mb-4">
          <div className="p-2 rounded-lg bg-purple-500/20">
            <Layers className="w-5 h-5 text-purple-400" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-text-primary">Smart Document Generator</h3>
              <Badge color="purple" size="xs">FDA Hybrid</Badge>
            </div>
            <p className="text-xs text-text-muted">
              Generate PDF with embedded CQI, JSON-LD, and FHIR data
            </p>
          </div>
        </div>
        
        {/* Capability Indicators */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          <div className="flex items-center gap-1.5 px-2 py-1.5 bg-surface rounded text-xs">
            <FileText className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-text-secondary">Layer 1</span>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1.5 bg-surface rounded text-xs">
            <Database className="w-3.5 h-3.5 text-green-400" />
            <span className="text-text-secondary">Layer 2</span>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1.5 bg-surface rounded text-xs">
            <Link2 className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-text-secondary">SCA Tags</span>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1.5 bg-surface rounded text-xs">
            <Cpu className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-text-secondary">FHIR</span>
          </div>
        </div>
        
        {/* Data Summary */}
        <div className="p-3 bg-surface rounded-lg mb-4">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="text-text-muted">Data to Embed</span>
            <button 
              onClick={() => setShowDataPreview(!showDataPreview)}
              className="text-accent-blue hover:underline flex items-center gap-1"
            >
              {showDataPreview ? 'Hide' : 'Preview'}
              {showDataPreview ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>
          
          <div className="flex items-center gap-4 text-sm">
            <div>
              <span className="text-text-muted">Sections:</span>
              <span className="ml-1 font-medium text-text-primary">{sections.length}</span>
            </div>
            <div>
              <span className="text-text-muted">Data Links:</span>
              <span className="ml-1 font-medium text-accent-blue">{dataRefCount}</span>
            </div>
            {specCount > 0 && (
              <div>
                <span className="text-text-muted">Specs:</span>
                <span className="ml-1 font-medium text-accent-green">{specCount}</span>
              </div>
            )}
            {batchCount > 0 && (
              <div>
                <span className="text-text-muted">Batches:</span>
                <span className="ml-1 font-medium text-accent-amber">{batchCount}</span>
              </div>
            )}
          </div>
          
          {showDataPreview && (
            <div className="mt-3 pt-3 border-t border-border">
              <div className="text-xs font-mono text-text-muted bg-surface-card p-2 rounded max-h-32 overflow-auto">
                <div className="text-purple-400">// JSON-LD Preview</div>
                <div>{`"@context": { "ligature": "urn:ligature:vocab#", "fhir": "http://hl7.org/fhir/" }`}</div>
                <div>{`"@type": "ligature:RegulatorySubmission"`}</div>
                <div>{`"ligature:productName": "${productName}"`}</div>
                <div>{`"ligature:ctdSection": "${ctdSection}"`}</div>
                {specCount > 0 && <div className="text-green-400">{`// ${specCount} specifications embedded`}</div>}
                {batchCount > 0 && <div className="text-amber-400">{`// ${batchCount} batch records embedded`}</div>}
              </div>
            </div>
          )}
        </div>
        
        {/* Error Display */}
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg mb-4 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400" />
            <span className="text-sm text-red-400">{error}</span>
          </div>
        )}
        
        {/* Generation Result */}
        {result && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg mb-4">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-medium text-emerald-400">Smart Document Generated</span>
            </div>
            
            <div className="space-y-2">
              <button
                onClick={downloadPDF}
                className="w-full flex items-center gap-2 px-3 py-2 bg-surface hover:bg-surface-card rounded-lg transition-colors text-left"
              >
                <FileText className="w-4 h-4 text-blue-400" />
                <div className="flex-1">
                  <div className="text-sm font-medium text-text-primary">{result.metadata.filename}</div>
                  <div className="text-xs text-text-muted">PDF with human-readable content</div>
                </div>
                <Download className="w-4 h-4 text-text-muted" />
              </button>
              
              <button
                onClick={() => downloadJSON('jsonLD')}
                className="w-full flex items-center gap-2 px-3 py-2 bg-surface hover:bg-surface-card rounded-lg transition-colors text-left"
              >
                <Code className="w-4 h-4 text-purple-400" />
                <div className="flex-1">
                  <div className="text-sm font-medium text-text-primary">{result.metadata.jsonLDFilename}</div>
                  <div className="text-xs text-text-muted">JSON-LD with CQI + SCA tags</div>
                </div>
                <Download className="w-4 h-4 text-text-muted" />
              </button>
              
              <button
                onClick={() => downloadJSON('fhir')}
                className="w-full flex items-center gap-2 px-3 py-2 bg-surface hover:bg-surface-card rounded-lg transition-colors text-left"
              >
                <FileJson className="w-4 h-4 text-green-400" />
                <div className="flex-1">
                  <div className="text-sm font-medium text-text-primary">{result.metadata.fhirFilename.replace('-data', '-fhir')}</div>
                  <div className="text-xs text-text-muted">FHIR R4 Bundle (MedicinalProduct, Substance)</div>
                </div>
                <Download className="w-4 h-4 text-text-muted" />
              </button>
            </div>
          </div>
        )}
        
        {/* Generate Buttons */}
        <div className="space-y-2">
          {/* PDF/A-3 All-in-One (Primary) */}
          <Button
            variant="primary"
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            onClick={handleGeneratePdfA3}
            disabled={isGenerating || isGeneratingPdfA3}
          >
            {isGeneratingPdfA3 ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating PDF/A-3...
              </>
            ) : (
              <>
                <Package className="w-4 h-4 mr-2" />
                Generate PDF/A-3 (All-in-One)
              </>
            )}
          </Button>
          
          {/* Separate Files (Secondary) */}
          <Button
            variant="ghost"
            className="w-full text-text-secondary hover:text-text-primary"
            onClick={handleGenerate}
            disabled={isGenerating || isGeneratingPdfA3}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Separate Files
              </>
            )}
          </Button>
        </div>
        
        {/* Info Footer */}
        <div className="mt-3 flex items-center justify-center gap-4 text-xs text-text-muted">
          <span className="flex items-center gap-1">
            <ExternalLink className="w-3 h-3" />
            FDA Smart Submissions
          </span>
          <span>•</span>
          <span>PDF/A-3</span>
          <span>•</span>
          <span>ICH M4 CQI</span>
          <span>•</span>
          <span>HL7 FHIR R4</span>
        </div>
      </CardContent>
    </Card>
  );
}

export default SmartDocumentGenerator;
