



import { useState, useCallback, useMemo, useEffect } from 'react';
import {
  FileCheck, AlertTriangle, CheckCircle2, XCircle, RefreshCw, Play, Download,
  ChevronRight, ChevronDown, Search, Filter, FileText, Code, Shield, Zap,
  Clock, AlertCircle, Eye, Package, FolderTree, Globe, Settings, List,
  BarChart3, History, ArrowRight, Rocket, Bug, Wrench, FileWarning
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { SearchInput } from '@/components/ui/Input';
import { ProgressBar } from '@/components/ui/Progress';
import { useToast, useToastStore } from '@/components/ui/Toast';
import { useCrossModuleEventStore } from '@/store/useCrossModuleEventStore';
import {
  ectdPDFValidator,
  type PDFValidationResult,
  type PDFValidationIssue,
  type ValidationSeverity,
  type RegionalSpec,
  type PDFMetadata,
  type FontInfo,
  type PageInfo,
  type BookmarkInfo
} from '@/services/ectd-pdf-validator';
import type { BadgeColor } from '@/components/ui/Badge';

// =============================================================================
// TYPES
// =============================================================================

interface ECTDDocument {
  id: string;
  name: string;
  path: string;
  module: string;
  section: string;
  size: number;
  status: 'pending' | 'validating' | 'valid' | 'invalid' | 'warning';
  validationResult?: PDFValidationResult;
}

interface ValidationRun {
  id: string;
  startedAt: string;
  completedAt?: string;
  status: 'running' | 'completed' | 'failed';
  totalDocuments: number;
  validatedDocuments: number;
  passedDocuments: number;
  failedDocuments: number;
  warningDocuments: number;
  region: RegionalSpec;
  results: PDFValidationResult[];
}

type ValidationCategory = 'pdf' | 'backbone' | 'structure' | 'checksum' | 'region';

interface BackboneValidationResult {
  isValid: boolean;
  dtdCompliant: boolean;
  schemaCompliant: boolean;
  checksumValid: boolean;
  structureValid: boolean;
  issues: {
    id: string;
    severity: ValidationSeverity;
    category: string;
    message: string;
    location?: string;
  }[];
}

// =============================================================================
// MOCK DATA - Simulated documents for validation
// =============================================================================

const mockDocuments: ECTDDocument[] = [
  { id: 'doc-001', name: 'm1-cover-letter.pdf', path: '/m1/us/cover-letter.pdf', module: 'Module 1', section: '1.1 Cover Letter', size: 245000, status: 'pending' },
  { id: 'doc-002', name: 'm1-form-356h.pdf', path: '/m1/us/form-356h.pdf', module: 'Module 1', section: '1.2 Application Forms', size: 189000, status: 'pending' },
  { id: 'doc-003', name: 'm2-2-introduction.pdf', path: '/m2/introduction.pdf', module: 'Module 2', section: '2.2 Introduction', size: 567000, status: 'pending' },
  { id: 'doc-004', name: 'm2-3-quality-overall-summary.pdf', path: '/m2/qos.pdf', module: 'Module 2', section: '2.3 Quality Overall Summary', size: 2450000, status: 'pending' },
  { id: 'doc-005', name: 'm2-5-clinical-overview.pdf', path: '/m2/clinical-overview.pdf', module: 'Module 2', section: '2.5 Clinical Overview', size: 1890000, status: 'pending' },
  { id: 'doc-006', name: 'm2-7-clinical-summary.pdf', path: '/m2/clinical-summary.pdf', module: 'Module 2', section: '2.7 Clinical Summary', size: 3200000, status: 'pending' },
  { id: 'doc-007', name: 'm3-2-1-drug-substance-spec.pdf', path: '/m3/drug-substance/spec.pdf', module: 'Module 3', section: '3.2.S.4.1 Drug Substance Spec', size: 890000, status: 'pending' },
  { id: 'doc-008', name: 'm3-2-2-drug-product-spec.pdf', path: '/m3/drug-product/spec.pdf', module: 'Module 3', section: '3.2.P.5.1 Drug Product Spec', size: 1100000, status: 'pending' },
  { id: 'doc-009', name: 'm4-nonclinical-overview.pdf', path: '/m4/nonclinical-overview.pdf', module: 'Module 4', section: '4.2 Nonclinical Overview', size: 4500000, status: 'pending' },
  { id: 'doc-010', name: 'm5-clinical-study-report-001.pdf', path: '/m5/csr-001.pdf', module: 'Module 5', section: '5.3.5.1 CSR Study 001', size: 15600000, status: 'pending' },
  { id: 'doc-011', name: 'm5-clinical-study-report-002.pdf', path: '/m5/csr-002.pdf', module: 'Module 5', section: '5.3.5.2 CSR Study 002', size: 18900000, status: 'pending' },
  { id: 'doc-012', name: 'm5-csr-appendix-listings.pdf', path: '/m5/csr-appendix.pdf', module: 'Module 5', section: '5.3.5.3 CSR Appendices', size: 45000000, status: 'pending' },
];

// =============================================================================
// BADGE HELPERS
// =============================================================================

const getSeverityBadge = (severity: ValidationSeverity, size: 'xs' | 'sm' = 'xs') => {
  const config: Record<ValidationSeverity, { color: BadgeColor; label: string }> = {
    error: { color: 'red', label: 'Error' },
    warning: { color: 'amber', label: 'Warning' },
    info: { color: 'blue', label: 'Info' }
  };
  return <Badge color={config[severity].color} size={size}>{config[severity].label}</Badge>;
};

const getStatusBadge = (status: ECTDDocument['status'], size: 'xs' | 'sm' = 'xs') => {
  const config: Record<ECTDDocument['status'], { color: BadgeColor; label: string; icon: React.ReactNode }> = {
    pending: { color: 'slate', label: 'Pending', icon: <Clock className="w-3 h-3" /> },
    validating: { color: 'blue', label: 'Validating', icon: <RefreshCw className="w-3 h-3 animate-spin" /> },
    valid: { color: 'emerald', label: 'Valid', icon: <CheckCircle2 className="w-3 h-3" /> },
    invalid: { color: 'red', label: 'Invalid', icon: <XCircle className="w-3 h-3" /> },
    warning: { color: 'amber', label: 'Warnings', icon: <AlertTriangle className="w-3 h-3" /> }
  };
  const c = config[status];
  return <Badge color={c.color} size={size} icon={c.icon}>{c.label}</Badge>;
};

const getRegionBadge = (region: RegionalSpec, size: 'xs' | 'sm' = 'xs') => {
  const config: Record<RegionalSpec, { color: BadgeColor }> = {
    FDA: { color: 'blue' },
    EMA: { color: 'purple' },
    HC: { color: 'red' },
    PMDA: { color: 'pink' },
    TGA: { color: 'emerald' },
    ANVISA: { color: 'amber' },
    ICH: { color: 'cyan' }
  };
  return <Badge color={config[region]?.color || 'slate'} size={size}>{region}</Badge>;
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function ECTDValidationWorkflow() {
  // State
  const [documents, setDocuments] = useState<ECTDDocument[]>(mockDocuments);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<RegionalSpec>('FDA');
  const [activeTab, setActiveTab] = useState<'documents' | 'backbone' | 'summary' | 'history'>('documents');
  const [isValidating, setIsValidating] = useState(false);
  const [validationProgress, setValidationProgress] = useState(0);
  const [currentValidationRun, setCurrentValidationRun] = useState<ValidationRun | null>(null);
  const [validationHistory, setValidationHistory] = useState<ValidationRun[]>([]);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set(['Module 1', 'Module 2']));
  const [filterStatus, setFilterStatus] = useState<ECTDDocument['status'] | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [backboneResult, setBackboneResult] = useState<BackboneValidationResult | null>(null);
  
  // External hooks
  const toast = useToast();
  const addToast = useToastStore((s) => s.addToast);
  const { emitEvent } = useCrossModuleEventStore();

  // Selected document
  const selectedDoc = useMemo(() => documents.find(d => d.id === selectedDocId), [documents, selectedDocId]);

  // Stats
  const stats = useMemo(() => ({
    total: documents.length,
    pending: documents.filter(d => d.status === 'pending').length,
    valid: documents.filter(d => d.status === 'valid').length,
    invalid: documents.filter(d => d.status === 'invalid').length,
    warning: documents.filter(d => d.status === 'warning').length,
    validating: documents.filter(d => d.status === 'validating').length
  }), [documents]);

  // Grouped by module
  const documentsByModule = useMemo(() => {
    const grouped: Record<string, ECTDDocument[]> = {};
    documents.forEach(doc => {
      if (!grouped[doc.module]) grouped[doc.module] = [];
      grouped[doc.module].push(doc);
    });
    return grouped;
  }, [documents]);

  // Filtered documents
  const filteredDocuments = useMemo(() => {
    return documents.filter(doc => {
      const matchesStatus = filterStatus === 'all' || doc.status === filterStatus;
      const matchesSearch = !searchQuery || 
        doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.section.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [documents, filterStatus, searchQuery]);

  // ==========================================================================
  // VALIDATION LOGIC
  // ==========================================================================

  const validateDocument = useCallback(async (doc: ECTDDocument): Promise<PDFValidationResult> => {
    // Simulate document data
    const mockData = {
      metadata: {
        title: doc.name.replace('.pdf', ''),
        pdfVersion: '1.6',
        pageCount: Math.max(1, Math.floor(doc.size / 50000)),
        fileSize: doc.size,
        isEncrypted: false,
        isPDFA: Math.random() > 0.3,
        hasBookmarks: doc.size > 500000,
        bookmarkCount: Math.floor(doc.size / 100000),
        isTagged: Math.random() > 0.4,
        isLinearized: Math.random() > 0.5
      } as PDFMetadata,
      fonts: [
        { name: 'Arial', type: 'TrueType' as const, isEmbedded: true, isSubset: true, usedOnPages: [1] },
        { name: 'Times New Roman', type: 'TrueType' as const, isEmbedded: Math.random() > 0.15, isSubset: true, usedOnPages: [1, 2] }
      ] as FontInfo[],
      pages: Array.from({ length: Math.max(1, Math.floor(doc.size / 50000)) }, (_, i) => ({
        pageNumber: i + 1,
        width: 612,
        height: 792,
        orientation: 'portrait' as const,
        hasText: true,
        isScanned: Math.random() < 0.05,
        rotation: 0
      })) as PageInfo[],
      bookmarks: [] as BookmarkInfo[]
    };

    return ectdPDFValidator.validateDocument(
      doc.id,
      doc.name,
      mockData,
      [selectedRegion, 'ICH']
    );
  }, [selectedRegion]);

  const runFullValidation = useCallback(async () => {
    setIsValidating(true);
    setValidationProgress(0);
    
    const runId = `run-${Date.now()}`;
    const run: ValidationRun = {
      id: runId,
      startedAt: new Date().toISOString(),
      status: 'running',
      totalDocuments: documents.length,
      validatedDocuments: 0,
      passedDocuments: 0,
      failedDocuments: 0,
      warningDocuments: 0,
      region: selectedRegion,
      results: []
    };
    setCurrentValidationRun(run);

    addToast({
      type: 'info',
      message: `Validating ${documents.length} documents against ${selectedRegion} requirements...`,
      duration: 3000
    });

    // Set all to validating
    setDocuments(prev => prev.map(d => ({ ...d, status: 'validating' as const })));

    const results: PDFValidationResult[] = [];
    
    for (let i = 0; i < documents.length; i++) {
      const doc = documents[i];
      
      // Simulate validation time
      await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 300));
      
      const result = await validateDocument(doc);
      results.push(result);
      
      // Determine status
      let newStatus: ECTDDocument['status'];
      if (!result.isValid) {
        newStatus = 'invalid';
        run.failedDocuments++;
      } else if (result.issues.some(i => i.severity === 'warning')) {
        newStatus = 'warning';
        run.warningDocuments++;
      } else {
        newStatus = 'valid';
        run.passedDocuments++;
      }
      
      run.validatedDocuments = i + 1;
      
      // Update document status
      setDocuments(prev => prev.map(d => 
        d.id === doc.id 
          ? { ...d, status: newStatus, validationResult: result }
          : d
      ));
      
      setValidationProgress(Math.round(((i + 1) / documents.length) * 100));
      setCurrentValidationRun({ ...run, results: [...results] });
    }

    // Complete validation run
    run.completedAt = new Date().toISOString();
    run.status = 'completed';
    run.results = results;
    setCurrentValidationRun(run);
    setValidationHistory(prev => [run, ...prev]);
    
    // Emit cross-module event
    emitEvent(
      'ectd-validation-complete',
      'submissions',
      {
        runId,
        region: selectedRegion,
        totalDocuments: documents.length,
        passed: run.passedDocuments,
        failed: run.failedDocuments,
        warnings: run.warningDocuments,
        overallValid: run.failedDocuments === 0
      },
      {
        correlationId: runId,
        priority: run.failedDocuments > 0 ? 'high' : 'medium',
        automated: true,
        requiresReview: run.failedDocuments > 0
      }
    );

    // Show completion toast
    if (run.failedDocuments === 0) {
      addToast({
        type: 'success',
        message: `✅ All ${documents.length} documents passed ${selectedRegion} validation. ${run.warningDocuments} warnings.`,
        duration: 5000
      });
    } else {
      addToast({
        type: 'error',
        message: `❌ ${run.failedDocuments} of ${documents.length} documents failed. Fix errors before submission.`,
        duration: 5000
      });
    }

    setIsValidating(false);
  }, [documents, selectedRegion, validateDocument, emitEvent, addToast]);

  const validateBackbone = useCallback(async () => {
    addToast({
      type: 'info',
      message: 'Validating Backbone - Checking XML structure, DTD compliance, and checksums...',
      duration: 2000
    });

    await new Promise(resolve => setTimeout(resolve, 1500));

    // Simulate backbone validation
    const issues: BackboneValidationResult['issues'] = [];
    
    // Random chance of issues for demo
    if (Math.random() < 0.2) {
      issues.push({
        id: 'XML-001',
        severity: 'warning',
        category: 'XML Structure',
        message: 'Optional element m2-6-nonclinical-summary is empty',
        location: '/m2/nonclinical-summary'
      });
    }
    
    if (Math.random() < 0.1) {
      issues.push({
        id: 'CHK-001',
        severity: 'warning',
        category: 'Checksums',
        message: 'MD5 checksum mismatch detected',
        location: '/m5/csr-appendix.pdf'
      });
    }

    const result: BackboneValidationResult = {
      isValid: issues.filter(i => i.severity === 'error').length === 0,
      dtdCompliant: true,
      schemaCompliant: true,
      checksumValid: !issues.some(i => i.category === 'Checksums'),
      structureValid: true,
      issues
    };

    setBackboneResult(result);

    if (result.isValid) {
      addToast({
        type: 'success',
        message: `✅ Backbone Valid - XML backbone passed all validation checks. ${issues.length} minor warnings.`,
        duration: 4000
      });
    } else {
      addToast({
        type: 'error',
        message: '❌ Backbone Issues Found - Fix backbone errors before proceeding.',
        duration: 6000
      });
    }
  }, [addToast]);

  const revalidateDocument = useCallback(async (docId: string) => {
    const doc = documents.find(d => d.id === docId);
    if (!doc) return;

    setDocuments(prev => prev.map(d => 
      d.id === docId ? { ...d, status: 'validating' } : d
    ));

    await new Promise(resolve => setTimeout(resolve, 500));
    const result = await validateDocument(doc);

    let newStatus: ECTDDocument['status'];
    if (!result.isValid) {
      newStatus = 'invalid';
    } else if (result.issues.some(i => i.severity === 'warning')) {
      newStatus = 'warning';
    } else {
      newStatus = 'valid';
    }

    setDocuments(prev => prev.map(d => 
      d.id === docId ? { ...d, status: newStatus, validationResult: result } : d
    ));

    addToast({
      type: newStatus === 'valid' ? 'success' : newStatus === 'warning' ? 'warning' : 'error',
      message: `${newStatus === 'valid' ? 'Document Valid' : newStatus === 'warning' ? 'Warnings Found' : 'Validation Failed'}: ${doc.name} - ${result.issues.length} issues found`,
      duration: 3000
    });
  }, [documents, validateDocument, addToast]);

  // Toggle module expansion
  const toggleModule = useCallback((module: string) => {
    setExpandedModules(prev => {
      const next = new Set(prev);
      if (next.has(module)) {
        next.delete(module);
      } else {
        next.add(module);
      }
      return next;
    });
  }, []);

  return (
    <div className="h-full flex flex-col bg-surface">
      {/* HEADER */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
              <FileCheck className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-text-primary">eCTD Validation Workflow</h1>
              <p className="text-sm text-text-muted">Comprehensive PDF, backbone, and regional compliance validation</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value as RegionalSpec)}
              className="px-3 py-2 bg-surface-card border border-border rounded-lg text-sm text-text-primary"
              disabled={isValidating}
            >
              <option value="FDA">FDA (US)</option>
              <option value="EMA">EMA (EU)</option>
              <option value="HC">Health Canada</option>
              <option value="PMDA">PMDA (Japan)</option>
              <option value="TGA">TGA (Australia)</option>
            </select>
            <Button
              variant="primary"
              icon={isValidating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
              onClick={runFullValidation}
              disabled={isValidating}
            >
              {isValidating ? `Validating ${validationProgress}%` : 'Run Full Validation'}
            </Button>
          </div>
        </div>

        {/* Progress bar during validation */}
        {isValidating && (
          <div className="mb-4">
            <div className="h-2 bg-surface-elevated rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-500 transition-all duration-300"
                style={{ width: `${validationProgress}%` }}
              />
            </div>
            <div className="text-xs text-text-muted mt-1">
              {currentValidationRun?.validatedDocuments || 0} of {stats.total} documents validated
            </div>
          </div>
        )}

        {/* STATS ROW */}
        <div className="grid grid-cols-6 gap-4">
          <div className="bg-surface-card border border-border rounded-lg p-4">
            <div className="text-2xl font-bold text-text-primary">{stats.total}</div>
            <div className="text-xs text-text-muted">Total Documents</div>
          </div>
          <div className="bg-slate-500/10 border border-slate-500/20 rounded-lg p-4">
            <div className="text-2xl font-bold text-slate-400">{stats.pending}</div>
            <div className="text-xs text-slate-400/80">Pending</div>
          </div>
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4">
            <div className="text-2xl font-bold text-emerald-400">{stats.valid}</div>
            <div className="text-xs text-emerald-400/80">Valid</div>
          </div>
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
            <div className="text-2xl font-bold text-amber-400">{stats.warning}</div>
            <div className="text-xs text-amber-400/80">Warnings</div>
          </div>
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
            <div className="text-2xl font-bold text-red-400">{stats.invalid}</div>
            <div className="text-xs text-red-400/80">Invalid</div>
          </div>
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
            <div className="text-2xl font-bold text-blue-400">{getRegionBadge(selectedRegion, 'sm')}</div>
            <div className="text-xs text-blue-400/80">Target Region</div>
          </div>
        </div>

        {/* TABS */}
        <div className="flex gap-1 mt-4 bg-surface-card p-1 rounded-lg w-fit">
          {(['documents', 'backbone', 'summary', 'history'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === tab
                  ? 'bg-accent-blue text-white'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-elevated'
              }`}
            >
              {tab === 'documents' && <><FileText className="w-4 h-4 inline-block mr-1" />Documents</>}
              {tab === 'backbone' && <><Code className="w-4 h-4 inline-block mr-1" />Backbone</>}
              {tab === 'summary' && <><BarChart3 className="w-4 h-4 inline-block mr-1" />Summary</>}
              {tab === 'history' && <><History className="w-4 h-4 inline-block mr-1" />History</>}
            </button>
          ))}
        </div>
      </div>

      {/* CONTENT */}
      <div className="flex-1 overflow-auto p-6">
        {/* DOCUMENTS TAB */}
        {activeTab === 'documents' && (
          <div className="grid grid-cols-3 gap-6">
            <div className="col-span-2 space-y-4">
              <div className="flex items-center gap-4">
                <SearchInput
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search documents..."
                  className="flex-1"
                />
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as ECTDDocument['status'] | 'all')}
                  className="px-3 py-2 bg-surface-card border border-border rounded-lg text-sm text-text-primary"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="valid">Valid</option>
                  <option value="warning">Warnings</option>
                  <option value="invalid">Invalid</option>
                </select>
              </div>

              {/* Document list grouped by module */}
              <div className="space-y-3">
                {Object.entries(documentsByModule).map(([module, docs]) => {
                  const filteredDocs = docs.filter(d => 
                    (filterStatus === 'all' || d.status === filterStatus) &&
                    (!searchQuery || d.name.toLowerCase().includes(searchQuery.toLowerCase()) || d.section.toLowerCase().includes(searchQuery.toLowerCase()))
                  );
                  if (filteredDocs.length === 0) return null;
                  
                  const isExpanded = expandedModules.has(module);
                  const moduleStats = {
                    valid: docs.filter(d => d.status === 'valid').length,
                    invalid: docs.filter(d => d.status === 'invalid').length,
                    warning: docs.filter(d => d.status === 'warning').length
                  };

                  return (
                    <Card key={module}>
                      <button
                        onClick={() => toggleModule(module)}
                        className="w-full p-4 flex items-center justify-between hover:bg-surface-elevated transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          {isExpanded ? <ChevronDown className="w-5 h-5 text-text-muted" /> : <ChevronRight className="w-5 h-5 text-text-muted" />}
                          <FolderTree className="w-5 h-5 text-blue-400" />
                          <span className="font-medium text-text-primary">{module}</span>
                          <span className="text-sm text-text-muted">({filteredDocs.length} documents)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {moduleStats.valid > 0 && <Badge color="emerald" size="xs">{moduleStats.valid} ✓</Badge>}
                          {moduleStats.warning > 0 && <Badge color="amber" size="xs">{moduleStats.warning} ⚠</Badge>}
                          {moduleStats.invalid > 0 && <Badge color="red" size="xs">{moduleStats.invalid} ✗</Badge>}
                        </div>
                      </button>
                      {isExpanded && (
                        <CardContent className="p-0 border-t border-border">
                          <div className="divide-y divide-border">
                            {filteredDocs.map(doc => (
                              <div
                                key={doc.id}
                                onClick={() => setSelectedDocId(doc.id)}
                                className={`p-3 flex items-center gap-3 cursor-pointer transition-colors ${
                                  selectedDocId === doc.id ? 'bg-blue-500/10' : 'hover:bg-surface-elevated'
                                }`}
                              >
                                <FileText className="w-4 h-4 text-text-muted flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-medium text-text-primary truncate">{doc.name}</div>
                                  <div className="text-xs text-text-muted truncate">{doc.section}</div>
                                </div>
                                <div className="text-xs text-text-muted">{(doc.size / 1024 / 1024).toFixed(1)} MB</div>
                                {getStatusBadge(doc.status)}
                                <button
                                  onClick={(e) => { e.stopPropagation(); revalidateDocument(doc.id); }}
                                  className="p-1.5 text-text-muted hover:text-blue-400 hover:bg-blue-500/10 rounded transition-colors"
                                  title="Re-validate"
                                >
                                  <RefreshCw className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      )}
                    </Card>
                  );
                })}
              </div>
            </div>

            {/* Document Detail Panel */}
            <div>
              {selectedDoc ? (
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-blue-400" />
                      <h3 className="text-sm font-medium text-text-primary">Document Details</h3>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <div className="text-xs text-text-muted mb-1">File Name</div>
                        <div className="text-sm font-medium text-text-primary">{selectedDoc.name}</div>
                      </div>
                      <div>
                        <div className="text-xs text-text-muted mb-1">Section</div>
                        <div className="text-sm text-text-secondary">{selectedDoc.section}</div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-xs text-text-muted mb-1">Status</div>
                          {getStatusBadge(selectedDoc.status, 'sm')}
                        </div>
                        <div>
                          <div className="text-xs text-text-muted mb-1">Size</div>
                          <div className="text-sm text-text-primary">{(selectedDoc.size / 1024 / 1024).toFixed(2)} MB</div>
                        </div>
                      </div>

                      {/* Validation Result */}
                      {selectedDoc.validationResult && (
                        <>
                          <div className="pt-4 border-t border-border">
                            <div className="flex items-center justify-between mb-3">
                              <div className="text-xs text-text-muted">Validation Score</div>
                              <div className={`text-lg font-bold ${
                                selectedDoc.validationResult.score >= 80 ? 'text-emerald-400' :
                                selectedDoc.validationResult.score >= 60 ? 'text-amber-400' : 'text-red-400'
                              }`}>
                                {selectedDoc.validationResult.score}%
                              </div>
                            </div>
                            <div className="h-2 bg-surface rounded-full overflow-hidden">
                              <div 
                                className={`h-full transition-all ${
                                  selectedDoc.validationResult.score >= 80 ? 'bg-emerald-500' :
                                  selectedDoc.validationResult.score >= 60 ? 'bg-amber-500' : 'bg-red-500'
                                }`}
                                style={{ width: `${selectedDoc.validationResult.score}%` }}
                              />
                            </div>
                          </div>

                          {/* Issues */}
                          {selectedDoc.validationResult.issues.length > 0 && (
                            <div>
                              <div className="text-xs text-text-muted mb-2">
                                Issues ({selectedDoc.validationResult.issues.length})
                              </div>
                              <div className="space-y-2 max-h-60 overflow-auto">
                                {selectedDoc.validationResult.issues.map((issue, i) => (
                                  <div 
                                    key={i}
                                    className={`p-2 rounded-lg text-xs ${
                                      issue.severity === 'error' ? 'bg-red-500/10 border border-red-500/20' :
                                      issue.severity === 'warning' ? 'bg-amber-500/10 border border-amber-500/20' :
                                      'bg-blue-500/10 border border-blue-500/20'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2 mb-1">
                                      {getSeverityBadge(issue.severity)}
                                      <span className="font-mono text-text-muted">{issue.id}</span>
                                    </div>
                                    <div className="text-text-primary">{issue.message}</div>
                                    {issue.fixSuggestion && (
                                      <div className="mt-1 text-text-muted flex items-center gap-1">
                                        <Wrench className="w-3 h-3" />
                                        {issue.fixSuggestion}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {selectedDoc.validationResult.issues.length === 0 && (
                            <div className="p-4 bg-emerald-500/10 rounded-lg text-center">
                              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                              <div className="text-sm text-emerald-400">No issues found</div>
                            </div>
                          )}
                        </>
                      )}

                      {!selectedDoc.validationResult && selectedDoc.status === 'pending' && (
                        <div className="p-4 bg-surface rounded-lg text-center">
                          <Clock className="w-8 h-8 text-text-muted mx-auto mb-2" />
                          <div className="text-sm text-text-muted">Not yet validated</div>
                          <Button
                            variant="primary"
                            size="sm"
                            className="mt-3"
                            onClick={() => revalidateDocument(selectedDoc.id)}
                          >
                            Validate Now
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <FileText className="w-12 h-12 text-text-muted mx-auto mb-3" />
                    <div className="text-sm text-text-muted">Select a document to view details</div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}

        {/* BACKBONE TAB */}
        {activeTab === 'backbone' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Code className="w-5 h-5 text-purple-400" />
                    <h3 className="font-medium text-text-primary">XML Backbone Validation</h3>
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={validateBackbone}
                    icon={<Play className="w-4 h-4" />}
                  >
                    Validate Backbone
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {backboneResult ? (
                  <div className="space-y-4">
                    {/* Validation checks */}
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: 'DTD Compliance', valid: backboneResult.dtdCompliant, desc: 'ich-ectd-3-2.dtd' },
                        { label: 'Schema Validation', valid: backboneResult.schemaCompliant, desc: 'XML Schema compliant' },
                        { label: 'Checksum Verification', valid: backboneResult.checksumValid, desc: 'MD5 checksums match' },
                        { label: 'Structure Valid', valid: backboneResult.structureValid, desc: 'Folder hierarchy correct' }
                      ].map((check, i) => (
                        <div 
                          key={i}
                          className={`p-3 rounded-lg flex items-center gap-3 ${
                            check.valid ? 'bg-emerald-500/10' : 'bg-red-500/10'
                          }`}
                        >
                          {check.valid ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                          )}
                          <div>
                            <div className="text-sm font-medium text-text-primary">{check.label}</div>
                            <div className="text-xs text-text-muted">{check.desc}</div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Issues */}
                    {backboneResult.issues.length > 0 && (
                      <div>
                        <div className="text-sm font-medium text-text-primary mb-2">Issues Found</div>
                        <div className="space-y-2">
                          {backboneResult.issues.map((issue, i) => (
                            <div key={i} className={`p-3 rounded-lg ${
                              issue.severity === 'error' ? 'bg-red-500/10 border border-red-500/20' :
                              'bg-amber-500/10 border border-amber-500/20'
                            }`}>
                              <div className="flex items-center gap-2 mb-1">
                                {getSeverityBadge(issue.severity)}
                                <span className="text-sm font-medium text-text-primary">{issue.category}</span>
                              </div>
                              <div className="text-sm text-text-secondary">{issue.message}</div>
                              {issue.location && (
                                <div className="text-xs text-text-muted mt-1 font-mono">{issue.location}</div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {backboneResult.issues.length === 0 && (
                      <div className="p-6 bg-emerald-500/10 rounded-lg text-center">
                        <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-2" />
                        <div className="text-lg font-medium text-emerald-400">Backbone Valid</div>
                        <div className="text-sm text-text-muted">All structural checks passed</div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-8 text-center">
                    <Code className="w-12 h-12 text-text-muted mx-auto mb-3" />
                    <div className="text-sm text-text-muted">Click "Validate Backbone" to check XML structure</div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Sample backbone preview */}
            <Card>
              <CardHeader>
                <h3 className="text-sm font-medium text-text-primary">Backbone Structure Preview</h3>
              </CardHeader>
              <CardContent>
                <pre className="text-xs text-blue-400 font-mono bg-surface p-4 rounded-lg overflow-x-auto">
{`<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE ectd:ectd SYSTEM "ich-ectd-3-2.dtd">
<ectd:ectd xmlns:ectd="http://www.ich.org/ectd"
           xmlns:xlink="http://www.w3.org/1999/xlink"
           dtd-version="3.2">
  <m1-administrative-information-and-prescribing-information>
    <m1-1-forms>
      <leaf operation="new" ID="m1-1-forms-001"
            xlink:href="m1/us/form-356h.pdf" checksum="a1b2c3..." />
    </m1-1-forms>
    <m1-2-cover-letter>
      <leaf operation="new" ID="m1-2-cover-001"
            xlink:href="m1/us/cover-letter.pdf" checksum="d4e5f6..." />
    </m1-2-cover-letter>
  </m1-administrative-information-and-prescribing-information>
  <m2-common-technical-document-summaries>
    <m2-2-introduction>...</m2-2-introduction>
    <m2-3-quality-overall-summary>...</m2-3-quality-overall-summary>
    <m2-5-clinical-overview>...</m2-5-clinical-overview>
    <m2-7-clinical-summary>...</m2-7-clinical-summary>
  </m2-common-technical-document-summaries>
  ...
</ectd:ectd>`}
                </pre>
              </CardContent>
            </Card>
          </div>
        )}

        {/* SUMMARY TAB */}
        {activeTab === 'summary' && currentValidationRun && (
          <div className="max-w-4xl mx-auto space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-blue-400" />
                    <h3 className="font-medium text-text-primary">Validation Summary</h3>
                  </div>
                  {getRegionBadge(currentValidationRun.region, 'sm')}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-4 mb-6">
                  <div className="p-4 bg-surface rounded-lg text-center">
                    <div className="text-3xl font-bold text-text-primary">{currentValidationRun.totalDocuments}</div>
                    <div className="text-sm text-text-muted">Total</div>
                  </div>
                  <div className="p-4 bg-emerald-500/10 rounded-lg text-center">
                    <div className="text-3xl font-bold text-emerald-400">{currentValidationRun.passedDocuments}</div>
                    <div className="text-sm text-emerald-400/80">Passed</div>
                  </div>
                  <div className="p-4 bg-amber-500/10 rounded-lg text-center">
                    <div className="text-3xl font-bold text-amber-400">{currentValidationRun.warningDocuments}</div>
                    <div className="text-sm text-amber-400/80">Warnings</div>
                  </div>
                  <div className="p-4 bg-red-500/10 rounded-lg text-center">
                    <div className="text-3xl font-bold text-red-400">{currentValidationRun.failedDocuments}</div>
                    <div className="text-sm text-red-400/80">Failed</div>
                  </div>
                </div>

                {/* Overall status */}
                <div className={`p-6 rounded-lg text-center ${
                  currentValidationRun.failedDocuments === 0 ? 'bg-emerald-500/10' : 'bg-red-500/10'
                }`}>
                  {currentValidationRun.failedDocuments === 0 ? (
                    <>
                      <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto mb-3" />
                      <div className="text-xl font-semibold text-emerald-400">Ready for Submission</div>
                      <div className="text-sm text-text-muted mt-1">
                        All documents passed {selectedRegion} validation requirements
                      </div>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-16 h-16 text-red-400 mx-auto mb-3" />
                      <div className="text-xl font-semibold text-red-400">Not Ready</div>
                      <div className="text-sm text-text-muted mt-1">
                        {currentValidationRun.failedDocuments} document(s) require fixes before submission
                      </div>
                    </>
                  )}
                </div>

                {/* Failed documents list */}
                {currentValidationRun.failedDocuments > 0 && (
                  <div className="mt-6">
                    <div className="text-sm font-medium text-text-primary mb-3">Documents Requiring Attention</div>
                    <div className="space-y-2">
                      {documents.filter(d => d.status === 'invalid' || d.status === 'warning').map(doc => (
                        <div 
                          key={doc.id}
                          onClick={() => { setSelectedDocId(doc.id); setActiveTab('documents'); }}
                          className={`p-3 rounded-lg cursor-pointer flex items-center justify-between ${
                            doc.status === 'invalid' ? 'bg-red-500/10 border border-red-500/20' : 'bg-amber-500/10 border border-amber-500/20'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <FileText className="w-4 h-4 text-text-muted" />
                            <div>
                              <div className="text-sm font-medium text-text-primary">{doc.name}</div>
                              <div className="text-xs text-text-muted">{doc.validationResult?.issues.length || 0} issues</div>
                            </div>
                          </div>
                          {getStatusBadge(doc.status)}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'summary' && !currentValidationRun && (
          <div className="max-w-4xl mx-auto">
            <Card>
              <CardContent className="p-12 text-center">
                <BarChart3 className="w-16 h-16 text-text-muted mx-auto mb-4" />
                <h3 className="text-lg font-medium text-text-primary mb-2">No Validation Run</h3>
                <p className="text-sm text-text-muted mb-4">Run a full validation to see the summary</p>
                <Button variant="primary" onClick={runFullValidation}>
                  Run Full Validation
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* HISTORY TAB */}
        {activeTab === 'history' && (
          <div className="max-w-4xl mx-auto space-y-4">
            {validationHistory.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <History className="w-16 h-16 text-text-muted mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-text-primary mb-2">No Validation History</h3>
                  <p className="text-sm text-text-muted">Previous validation runs will appear here</p>
                </CardContent>
              </Card>
            ) : (
              validationHistory.map(run => (
                <Card key={run.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          run.failedDocuments === 0 ? 'bg-emerald-500/20' : 'bg-red-500/20'
                        }`}>
                          {run.failedDocuments === 0 ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-400" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-text-primary">
                              {run.failedDocuments === 0 ? 'Validation Passed' : 'Validation Failed'}
                            </span>
                            {getRegionBadge(run.region)}
                          </div>
                          <div className="text-xs text-text-muted">
                            {new Date(run.startedAt).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-emerald-400">{run.passedDocuments} passed</span>
                        <span className="text-amber-400">{run.warningDocuments} warnings</span>
                        <span className="text-red-400">{run.failedDocuments} failed</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
