

import { useState, useCallback, useMemo } from 'react';
import {
  ChevronRight, ChevronDown, ChevronLeft, Folder, FolderOpen,
  FileText, Plus, Upload, Link2, Check, CheckCircle, AlertCircle,
  AlertTriangle, Clock, X, Search, Filter, Trash2, Eye, Edit3,
  Play, Send, RefreshCw, Loader2, ExternalLink, Download, Zap, GitCompare
} from 'lucide-react';
import { useSequenceBuilderStore, DocumentSlot, ValidationResult } from '@/store/useSequenceBuilderStore';
import { useSubmitSequenceAction } from '@/store/useSequenceBridge';
import { useToast } from '@/components/ui/Toast';
import { authoringDocuments } from '@/data/authoring-data';
import { AuthoringDocument, DocumentStatus } from '@/types/authoring';
import { HAQHandoffPanel } from './HAQHandoffPanel';
import { HAQHandoffReceiver } from './HAQHandoffReceiver';
import { SequenceComparisonPanel } from './SequenceComparisonPanel';
import { RDConnectedContextPanel } from './RDConnectedContextPanel';
// v0.14.5: Document Lineage Provenance
import { SubmissionsProvenanceIndicator } from './SubmissionsProvenanceIndicator';
import { useCrossModuleStore, usePendingHandoffs } from '@/store/useCrossModuleStore';
import { applicationsApi, SequenceInfo } from '@/lib/applications-api';

interface SubmissionBuilderProps {
  applicationId: string;
  applicationName: string;
  onClose?: () => void;
}

// Map authoring documents to CTD sections with detailed matching
const documentToCtdMapping: Record<string, { module: string; section: string; keywords: string[] }> = {
  'protocol': { module: '5', section: '5.3.5.1', keywords: ['protocol', 'study design'] },
  'ib': { module: '5', section: '5.3.5.1', keywords: ['investigator', 'brochure', 'ib'] },
  'csr': { module: '5', section: '5.3.5.1', keywords: ['clinical study report', 'csr', 'study report'] },
  'sap': { module: '5', section: '5.3.5.3', keywords: ['statistical', 'analysis plan', 'sap'] },
  'ise': { module: '5', section: '5.3.5.3', keywords: ['efficacy', 'integrated summary', 'ise'] },
  'iss': { module: '5', section: '5.3.5.3', keywords: ['safety', 'integrated summary', 'iss'] },
  'module-25': { module: '2', section: '2.5', keywords: ['clinical overview', '2.5'] },
  'module-27': { module: '2', section: '2.7', keywords: ['clinical summary', '2.7'] },
  'module-24': { module: '2', section: '2.4', keywords: ['nonclinical overview', '2.4'] },
  'module-26': { module: '2', section: '2.6', keywords: ['nonclinical summary', '2.6'] },
  'module-32s': { module: '3', section: '3.2.S', keywords: ['drug substance', 'active ingredient', '3.2.s'] },
  'module-32p': { module: '3', section: '3.2.P', keywords: ['drug product', 'finished product', '3.2.p'] },
  'dsur': { module: '5', section: '5.3.6', keywords: ['dsur', 'development safety', 'update report'] },
  'pbrer': { module: '5', section: '5.3.6', keywords: ['pbrer', 'periodic benefit', 'risk evaluation'] },
};

// CTD section to document type suggestions (reverse mapping)
const ctdSectionSuggestions: Record<string, { types: string[]; label: string }> = {
  '1.2': { types: ['cover-letter'], label: 'Cover Letter' },
  '1.3.1': { types: ['form-356h'], label: 'FDA Form 356h' },
  '1.12': { types: ['correspondence', 'haq-response'], label: 'Correspondence' },
  '1.12.1': { types: ['haq-response', 'ir-response'], label: 'Response to Questions' },
  '1.12.2': { types: ['supporting-docs', 'attachment'], label: 'Supporting Documents' },
  '2.2': { types: ['intro'], label: 'Introduction' },
  '2.3': { types: ['qos'], label: 'Quality Overall Summary' },
  '2.4': { types: ['module-24', 'nonclinical-overview'], label: 'Nonclinical Overview' },
  '2.5': { types: ['module-25', 'clinical-overview'], label: 'Clinical Overview' },
  '2.6': { types: ['module-26', 'nonclinical-summary'], label: 'Nonclinical Written/Tabulated Summaries' },
  '2.7': { types: ['module-27', 'clinical-summary'], label: 'Clinical Summary' },
  '3.2.S': { types: ['module-32s', 'drug-substance'], label: 'Drug Substance' },
  '3.2.P': { types: ['module-32p', 'drug-product'], label: 'Drug Product' },
  '5.3.5.1': { types: ['protocol', 'csr', 'ib'], label: 'Study Reports' },
  '5.3.5.3': { types: ['sap', 'ise', 'iss'], label: 'Reports of Analyses' },
  '5.3.6': { types: ['dsur', 'pbrer'], label: 'Postmarketing Experience' },
};

// Sequence templates for common submission types
const sequenceTemplates = {
  'original-nda': {
    name: 'Original NDA/BLA',
    description: 'Full new drug or biologics license application',
    requiredSections: ['1.2', '1.3.1', '2.2', '2.3', '2.4', '2.5', '2.6', '2.7', '3.2.S', '3.2.P', '5.3.5.1'],
  },
  'amendment': {
    name: 'Amendment',
    description: 'Safety update or protocol amendment',
    requiredSections: ['1.2', '5.3.6'],
  },
  'annual-report': {
    name: 'Annual Report',
    description: 'Yearly status report',
    requiredSections: ['1.2', '1.3.1'],
  },
  'haq-response': {
    name: 'HAQ Response',
    description: 'Response to health authority questions',
    requiredSections: ['1.2', '1.3.1'],
  },
  'type-ii-variation': {
    name: 'Type II Variation (EU)',
    description: 'Major variation requiring assessment',
    requiredSections: ['1.2', '2.3', '2.5', '2.7'],
  },
};

// Get status color for authoring document
const getStatusColor = (status: DocumentStatus) => {
  switch (status) {
    case 'approved':
    case 'submission-ready':
      return 'bg-accent-green/20 text-accent-green border-accent-green/30';
    case 'final-review':
    case 'qc-review':
      return 'bg-accent-blue/20 text-accent-blue border-accent-blue/30';
    case 'cross-functional-review':
    case 'internal-review':
      return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    case 'drafting':
      return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    default:
      return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
  }
};

// Check if document is ready for submission
const isSubmissionReady = (status: DocumentStatus) => {
  return status === 'approved' || status === 'submission-ready';
};

// Transform authoring documents for builder
const getAvailableDocuments = () => {
  return authoringDocuments.map(doc => {
    const mapping = documentToCtdMapping[doc.documentType] || { module: '5', section: '5.3' };
    return {
      id: doc.id,
      title: doc.title,
      shortTitle: doc.shortTitle,
      type: doc.documentType,
      version: doc.version,
      status: doc.status,
      progress: doc.progress,
      module: mapping.module,
      section: mapping.section,
      authorName: doc.authorName,
      updatedAt: doc.updatedAt,
      productName: doc.productName,
      isReady: isSubmissionReady(doc.status),
    };
  });
};

export function SubmissionBuilder({
  applicationId,
  applicationName,
  onClose,
}: SubmissionBuilderProps) {
  const toast = useToast();
  const currentDraft = useSequenceBuilderStore(s => s.currentDraft);
  const createDraft = useSequenceBuilderStore(s => s.createDraft);
  const assignDocument = useSequenceBuilderStore(s => s.assignDocument);
  const removeDocument = useSequenceBuilderStore(s => s.removeDocument);
  const setSlotOperation = useSequenceBuilderStore(s => s.setSlotOperation);
  const startValidation = useSequenceBuilderStore(s => s.startValidation);
  const clearValidation = useSequenceBuilderStore(s => s.clearValidation);
  const isValidating = useSequenceBuilderStore(s => s.isValidating);
  const isSubmitting = useSequenceBuilderStore(s => s.isSubmitting);
  const canSubmit = useSequenceBuilderStore(s => s.canSubmit);
  const getValidationSummary = useSequenceBuilderStore(s => s.getValidationSummary);
  const selectedSlotId = useSequenceBuilderStore(s => s.selectedSlotId);
  const selectSlot = useSequenceBuilderStore(s => s.selectSlot);
  
  // Derive selected section for R&D Connected context
  const selectedSection = useMemo(() => {
    if (!selectedSlotId || !currentDraft) return undefined;
    const slot = currentDraft.documentSlots.find(s => s.id === selectedSlotId);
    return slot?.sectionNumber;
  }, [selectedSlotId, currentDraft]);
  
  // Use the bridge for submission to sync with portfolio store
  const submitSequence = useSubmitSequenceAction();
  
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set(['1', '2', '3', '5']));
  const [searchQuery, setSearchQuery] = useState('');
  const [showDocumentPicker, setShowDocumentPicker] = useState(false);
  const [activeSlot, setActiveSlot] = useState<DocumentSlot | null>(null);
  const [showReadyOnly, setShowReadyOnly] = useState(false);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [dragOverSlotId, setDragOverSlotId] = useState<string | null>(null);
  const [showComparePanel, setShowComparePanel] = useState(false);
  
  // Sequence creation state
  const [isCreatingSequence, setIsCreatingSequence] = useState(false);
  const [sequenceInfo, setSequenceInfo] = useState<SequenceInfo | null>(null);
  const [sequenceError, setSequenceError] = useState<string | null>(null);
  
  // Get authoring documents
  const availableDocuments = useMemo(() => getAvailableDocuments(), []);
  const [draggedDoc, setDraggedDoc] = useState<typeof availableDocuments[0] | null>(null);
  
  const validationSummary = getValidationSummary();
  
  // Get suggested documents for a slot based on CTD section
  const getSuggestedDocuments = useCallback((slot: DocumentSlot) => {
    const sectionKey = slot.sectionNumber;
    const suggestions = ctdSectionSuggestions[sectionKey];
    
    if (!suggestions) return [];
    
    return availableDocuments.filter(doc => {
      // Match by document type
      if (suggestions.types.includes(doc.type)) return true;
      
      // Match by keywords in title
      const mapping = documentToCtdMapping[doc.type];
      if (mapping?.keywords) {
        const titleLower = doc.title.toLowerCase();
        return mapping.keywords.some(kw => titleLower.includes(kw));
      }
      
      return false;
    }).sort((a, b) => {
      // Prioritize ready documents
      if (a.isReady && !b.isReady) return -1;
      if (!a.isReady && b.isReady) return 1;
      return 0;
    });
  }, [availableDocuments]);
  
  // Real-time validation feedback for a slot
  const getSlotValidationStatus = useCallback((slot: DocumentSlot) => {
    if (!slot.assignedDocument) {
      return slot.required ? 'missing-required' : 'empty';
    }
    
    // Check if document matches expected section
    const assignedDoc = availableDocuments.find(d => d.id === slot.assignedDocument?.id);
    if (assignedDoc) {
      const mapping = documentToCtdMapping[assignedDoc.type];
      if (mapping && !slot.sectionNumber.startsWith(mapping.section)) {
        return 'section-mismatch';
      }
      if (!assignedDoc.isReady) {
        return 'not-ready';
      }
    }
    
    return slot.validationStatus || 'valid';
  }, [availableDocuments]);
  
  // Filter documents by search and ready status
  const filteredDocuments = useMemo(() => {
    let docs = availableDocuments;
    
    if (showReadyOnly) {
      docs = docs.filter(d => d.isReady);
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      docs = docs.filter(d => 
        d.title.toLowerCase().includes(query) ||
        d.shortTitle?.toLowerCase().includes(query) ||
        d.type.toLowerCase().includes(query) ||
        d.productName?.toLowerCase().includes(query)
      );
    }
    
    return docs;
  }, [availableDocuments, searchQuery, showReadyOnly]);
  
  // Group slots by module
  const slotsByModule = useMemo(() => {
    if (!currentDraft) return {};
    return currentDraft.documentSlots.reduce((acc, slot) => {
      if (!acc[slot.moduleNumber]) acc[slot.moduleNumber] = [];
      acc[slot.moduleNumber].push(slot);
      return acc;
    }, {} as Record<string, DocumentSlot[]>);
  }, [currentDraft]);
  
  const toggleModule = (moduleNum: string) => {
    const next = new Set(expandedModules);
    if (next.has(moduleNum)) {
      next.delete(moduleNum);
    } else {
      next.add(moduleNum);
    }
    setExpandedModules(next);
  };
  
  const getModuleTitle = (moduleNum: string) => {
    const titles: Record<string, string> = {
      '1': 'Module 1 - Administrative',
      '2': 'Module 2 - Summaries',
      '3': 'Module 3 - Quality',
      '4': 'Module 4 - Nonclinical',
      '5': 'Module 5 - Clinical',
    };
    return titles[moduleNum] || `Module ${moduleNum}`;
  };
  
  const getSlotStatusIcon = (slot: DocumentSlot) => {
    if (!slot.assignedDocument) {
      return slot.required 
        ? <AlertCircle className="w-4 h-4 text-red-400" />
        : <Clock className="w-4 h-4 text-slate-400" />;
    }
    if (slot.validationStatus === 'invalid') {
      return <AlertTriangle className="w-4 h-4 text-amber-400" />;
    }
    if (slot.validationStatus === 'valid') {
      return <CheckCircle className="w-4 h-4 text-accent-green" />;
    }
    return <FileText className="w-4 h-4 text-accent-blue" />;
  };
  
  const getOperationBadge = (operation: DocumentSlot['operation']) => {
    const config = {
      new: { label: 'New', color: 'bg-accent-green/20 text-accent-green' },
      replace: { label: 'Replace', color: 'bg-accent-amber/20 text-accent-amber' },
      append: { label: 'Append', color: 'bg-accent-blue/20 text-accent-blue' },
      delete: { label: 'Delete', color: 'bg-red-500/20 text-red-400' },
      none: { label: '', color: '' },
    };
    return config[operation];
  };
  
  const handleAssignDocument = (slot: DocumentSlot, doc: typeof availableDocuments[0]) => {
    assignDocument(slot.id, {
      id: doc.id,
      title: doc.title,
      sourceType: 'authoring',
      sourceId: doc.id,
    });
    setShowDocumentPicker(false);
    setActiveSlot(null);
    toast.success(`Assigned "${doc.title}" to ${slot.sectionTitle}`);
  };
  
  const handleRemoveDocument = (slot: DocumentSlot) => {
    removeDocument(slot.id);
    toast.info(`Removed document from ${slot.sectionTitle}`);
  };
  
  const handleValidate = async () => {
    await startValidation();
    const summary = getValidationSummary();
    if (summary) {
      if (summary.errors > 0) {
        toast.error(`Validation found ${summary.errors} error(s)`);
      } else if (summary.warnings > 0) {
        toast.info(`Validation passed with ${summary.warnings} warning(s)`);
      } else {
        toast.success('Validation passed successfully');
      }
    }
  };
  
  const handleSubmit = async () => {
    if (!currentDraft) return;
    
    const gatewayMap: Record<string, string> = {
      fda: 'fda-esg',
      ema: 'ema-cesp',
      pmda: 'pmda-gateway',
      hc: 'hc-cta',
    };
    
    const gateway = gatewayMap[currentDraft.region] || 'fda-esg';
    
    // Use the bridge to submit and sync with portfolio store
    const result = await submitSequence(currentDraft.id, gateway);
    
    if (result.success) {
      toast.success(`Submission successful! Tracking: ${result.trackingNumber}`);
    } else {
      toast.error(result.error || 'Submission failed');
    }
  };
  
  const handleDragStart = (doc: typeof availableDocuments[0]) => {
    setDraggedDoc(doc);
  };
  
  const handleDragOver = (e: React.DragEvent, slot: DocumentSlot) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setDragOverSlotId(slot.id);
    selectSlot(slot.id);
  };
  
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverSlotId(null);
  };
  
  const handleDrop = (e: React.DragEvent, slot: DocumentSlot) => {
    e.preventDefault();
    if (draggedDoc) {
      handleAssignDocument(slot, draggedDoc);
      
      // Show warning if document doesn't match expected section
      const mapping = documentToCtdMapping[draggedDoc.type];
      if (mapping && !slot.sectionNumber.startsWith(mapping.section)) {
        toast.info(`Note: ${draggedDoc.shortTitle || draggedDoc.title} is typically placed in Section ${mapping.section}`);
      }
    }
    setDraggedDoc(null);
    setDragOverSlotId(null);
    selectSlot(null);
  };
  
  const handleDragEnd = () => {
    setDraggedDoc(null);
    setDragOverSlotId(null);
  };
  
  // Auto-assign suggested document to slot
  const handleAutoAssign = (slot: DocumentSlot) => {
    const suggested = getSuggestedDocuments(slot);
    const readyDoc = suggested.find(d => d.isReady);
    
    if (readyDoc) {
      handleAssignDocument(slot, readyDoc);
      toast.success(`Auto-assigned "${readyDoc.shortTitle || readyDoc.title}"`);
    } else if (suggested.length > 0) {
      toast.info(`Best match "${suggested[0].shortTitle || suggested[0].title}" is not yet approved`);
    } else {
      toast.info('No matching documents found for this section');
    }
  };
  
  if (!currentDraft) {
    // Handler to create a new sequence
    const handleCreateSequence = async () => {
      setIsCreatingSequence(true);
      setSequenceError(null);
      
      try {
        // First, get the next available sequence number
        const { data: seqInfo } = await applicationsApi.getSequenceInfo(applicationId);
        setSequenceInfo(seqInfo);
        
        // Reserve the sequence (creates submission record in DB)
        const { data: reserved } = await applicationsApi.reserveSequence(applicationId, {
          type: 'amendment',
          description: 'Amendment - Safety Update',
        });
        
        // Create the local draft with the reserved sequence number
        createDraft({
          applicationId,
          sequenceNumber: reserved.sequenceNumber,
          sequenceType: 'amendment',
          description: 'Amendment - Safety Update',
          region: 'fda',
          createdBy: 'Sarah Chen',
        });
        
        toast.success(`Sequence ${reserved.sequenceNumber} created successfully`);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to create sequence';
        setSequenceError(message);
        toast.error(message);
      } finally {
        setIsCreatingSequence(false);
      }
    };
    
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center max-w-md">
          <FileText className="w-16 h-16 text-text-muted mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-text-primary mb-2">No Sequence Selected</h2>
          <p className="text-text-muted mb-4">Create a new sequence to start building your submission</p>
          
          {sequenceError && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {sequenceError}
            </div>
          )}
          
          {sequenceInfo && (
            <div className="mb-4 p-3 bg-surface-alt border border-border rounded-lg text-sm">
              <p className="text-text-muted">
                Previous sequences: <span className="text-text-primary font-medium">{sequenceInfo.totalSequences}</span>
              </p>
              <p className="text-text-muted">
                Next sequence: <span className="text-accent-blue font-medium">{sequenceInfo.nextSequenceFormatted}</span>
              </p>
            </div>
          )}
          
          <button
            onClick={handleCreateSequence}
            disabled={isCreatingSequence}
            className="px-4 py-2 bg-accent-blue text-white rounded-lg hover:bg-accent-blue/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 mx-auto"
          >
            {isCreatingSequence ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating Sequence...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                Create New Sequence
              </>
            )}
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border bg-surface flex items-center justify-between">
        <div className="flex items-center gap-4">
          {onClose && (
            <button onClick={onClose} className="text-text-muted hover:text-text-primary">
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <h2 className="text-lg font-semibold text-text-primary">
              Sequence {currentDraft.sequenceNumber} - {currentDraft.description}
            </h2>
            <p className="text-sm text-text-muted">
              {applicationName} • {currentDraft.region.toUpperCase()} • {currentDraft.sequenceType}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Status Badge */}
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
            currentDraft.status === 'validated' ? 'bg-accent-green/20 text-accent-green' :
            currentDraft.status === 'validating' ? 'bg-accent-blue/20 text-accent-blue' :
            currentDraft.status === 'submitted' ? 'bg-accent-purple/20 text-accent-purple' :
            'bg-slate-500/20 text-slate-400'
          }`}>
            {currentDraft.status.replace(/-/g, ' ')}
          </span>
          
          {/* Compare Button */}
          <button
            onClick={() => setShowComparePanel(!showComparePanel)}
            className={`px-4 py-2 border rounded-lg flex items-center gap-2 transition-colors ${
              showComparePanel 
                ? 'bg-accent-teal/10 border-accent-teal text-accent-teal' 
                : 'bg-surface-card border-border text-text-primary hover:bg-surface-elevated'
            }`}
          >
            <GitCompare className="w-4 h-4" />
            Compare
          </button>
          
          {/* Validation Button */}
          <button
            onClick={handleValidate}
            disabled={isValidating}
            className="px-4 py-2 bg-surface-card border border-border text-text-primary rounded-lg hover:bg-surface-elevated flex items-center gap-2 disabled:opacity-50"
          >
            {isValidating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            Validate
          </button>
          
          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={!canSubmit() || isSubmitting}
            className="px-4 py-2 bg-accent-blue text-white rounded-lg hover:bg-accent-blue/90 flex items-center gap-2 disabled:opacity-50"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Submit to Gateway
          </button>
        </div>
      </div>
      
      {/* Validation Summary */}
      {validationSummary && (
        <div className="p-3 border-b border-border bg-surface-elevated flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-sm text-text-muted">Validation Results:</span>
            {validationSummary.errors > 0 && (
              <span className="flex items-center gap-1 text-red-400 text-sm">
                <AlertCircle className="w-4 h-4" />
                {validationSummary.errors} errors
              </span>
            )}
            {validationSummary.warnings > 0 && (
              <span className="flex items-center gap-1 text-amber-400 text-sm">
                <AlertTriangle className="w-4 h-4" />
                {validationSummary.warnings} warnings
              </span>
            )}
            {validationSummary.info > 0 && (
              <span className="flex items-center gap-1 text-accent-blue text-sm">
                <CheckCircle className="w-4 h-4" />
                {validationSummary.info} passed
              </span>
            )}
          </div>
          <button
            onClick={clearValidation}
            className="text-xs text-text-muted hover:text-text-primary"
          >
            Clear
          </button>
        </div>
      )}
      
      {/* HAQ Handoff Panel - shows when IR response sequence and pending HAQ packages */}
      {currentDraft.sequenceType === 'ir-response' && (
        <div className="p-4 border-b border-border">
          <HAQHandoffPanel 
            onAcceptHandoff={(handoff) => {
              toast.success(`Added "${handoff.sourceTitle}" to section 1.12.1`);
            }}
          />
        </div>
      )}
      
      {/* HAQ Handoff Receiver - v0.9.2: Receives finalized HAQ packages with signatures */}
      <div className="p-4 border-b border-border">
        <HAQHandoffReceiver 
          applicationId={applicationId}
          targetSection="1.12.1"
          onAccept={(handoffId, packageId) => {
            toast.success(`Accepted finalized HAQ package (${packageId}) into submission`);
          }}
        />
      </div>
      
      {/* Sequence Comparison Panel */}
      {showComparePanel && (
        <div className="p-4 border-b border-border">
          <SequenceComparisonPanel
            applicationNumber={applicationId}
            availableSequences={['0000', '0001', '0002', '0003', currentDraft.sequenceNumber]}
            onComparisonComplete={(result) => {
              toast.success(`Compared ${result.sourceSequence.sequenceNumber} → ${result.targetSequence.sequenceNumber}: ${result.summary.totalChanges} changes`);
            }}
          />
        </div>
      )}
      
      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Document Tree */}
        <div className="flex-1 overflow-auto p-4">
          <div className="space-y-2">
            {Object.entries(slotsByModule).map(([moduleNum, slots]) => (
              <div key={moduleNum} className="bg-surface-card rounded-lg border border-border overflow-hidden">
                {/* Module Header */}
                <button
                  onClick={() => toggleModule(moduleNum)}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-surface transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {expandedModules.has(moduleNum) ? (
                      <FolderOpen className="w-5 h-5 text-accent-amber" />
                    ) : (
                      <Folder className="w-5 h-5 text-accent-amber" />
                    )}
                    <span className="font-medium text-text-primary">{getModuleTitle(moduleNum)}</span>
                    <span className="text-xs text-text-muted">
                      ({slots.filter(s => s.assignedDocument).length}/{slots.length})
                    </span>
                  </div>
                  {expandedModules.has(moduleNum) ? (
                    <ChevronDown className="w-4 h-4 text-text-muted" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-text-muted" />
                  )}
                </button>
                
                {/* Slots */}
                {expandedModules.has(moduleNum) && (
                  <div className="border-t border-border">
                    {slots.map(slot => {
                      const isDragOver = dragOverSlotId === slot.id;
                      const suggestedDocs = getSuggestedDocuments(slot);
                      const hasSuggestion = suggestedDocs.length > 0;
                      const bestSuggestion = suggestedDocs[0];
                      const realTimeStatus = getSlotValidationStatus(slot);
                      
                      return (
                        <div
                          key={slot.id}
                          onClick={() => selectSlot(slot.id)}
                          onDragOver={(e) => handleDragOver(e, slot)}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDrop(e, slot)}
                          className={`px-4 py-3 flex items-center justify-between border-b border-border last:border-b-0 transition-all cursor-pointer ${
                            isDragOver 
                              ? 'bg-accent-blue/20 border-l-4 border-l-accent-blue' 
                              : selectedSlotId === slot.id 
                                ? 'bg-accent-blue/10' 
                                : 'hover:bg-surface'
                          } ${
                            realTimeStatus === 'section-mismatch' ? 'bg-amber-500/5' :
                            realTimeStatus === 'not-ready' ? 'bg-amber-500/5' :
                            realTimeStatus === 'missing-required' ? 'bg-red-500/5' : ''
                          }`}
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            {getSlotStatusIcon(slot)}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-medium text-text-primary">
                                  {slot.sectionNumber} {slot.sectionTitle}
                                </span>
                                {slot.required && (
                                  <span className="text-xs text-red-400">*</span>
                                )}
                                {slot.operation !== 'none' && (
                                  <span className={`text-xs px-1.5 py-0.5 rounded ${getOperationBadge(slot.operation).color}`}>
                                    {getOperationBadge(slot.operation).label}
                                  </span>
                                )}
                                {realTimeStatus === 'section-mismatch' && (
                                  <span className="text-xs px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400">
                                    Section mismatch
                                  </span>
                                )}
                                {realTimeStatus === 'not-ready' && (
                                  <span className="text-xs px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400">
                                    Not approved
                                  </span>
                                )}
                              </div>
                              {slot.assignedDocument ? (
                                <span className="text-xs text-accent-blue truncate block">{slot.assignedDocument.title}</span>
                              ) : isDragOver && draggedDoc ? (
                                <span className="text-xs text-accent-green animate-pulse">
                                  Drop to assign "{draggedDoc.shortTitle || draggedDoc.title}"
                                </span>
                              ) : hasSuggestion && bestSuggestion ? (
                                <span className="text-xs text-text-muted">
                                  Suggested: {bestSuggestion.shortTitle || bestSuggestion.title}
                                  {!bestSuggestion.isReady && ' (not ready)'}
                                </span>
                              ) : (
                                <span className="text-xs text-text-muted">No document assigned</span>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {slot.assignedDocument ? (
                              <>
                                <button className="p-1 text-text-muted hover:text-accent-blue">
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => handleRemoveDocument(slot)}
                                  className="p-1 text-text-muted hover:text-red-400"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            ) : (
                              <>
                                {hasSuggestion && bestSuggestion?.isReady && (
                                  <button
                                    onClick={() => handleAutoAssign(slot)}
                                    className="px-2 py-1 text-xs bg-accent-green/20 text-accent-green rounded hover:bg-accent-green/30 flex items-center gap-1"
                                    title={`Auto-assign: ${bestSuggestion.shortTitle || bestSuggestion.title}`}
                                  >
                                    <Zap className="w-3 h-3" />
                                    Auto
                                  </button>
                                )}
                                <button
                                  onClick={() => {
                                    setActiveSlot(slot);
                                    setShowDocumentPicker(true);
                                  }}
                                  className="px-2 py-1 text-xs bg-accent-blue/20 text-accent-blue rounded hover:bg-accent-blue/30"
                                >
                                  Assign
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        
        {/* Right Panel - Available Documents from Authoring */}
        <div className="w-96 border-l border-border bg-surface-elevated flex flex-col">
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-text-primary">Authoring Documents</h3>
              <span className="text-xs text-text-muted">
                {filteredDocuments.filter(d => d.isReady).length} ready
              </span>
            </div>
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search documents..."
                className="w-full pl-9 pr-3 py-2 text-sm bg-surface-card border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-blue"
              />
            </div>
            <label className="flex items-center gap-2 text-xs text-text-secondary cursor-pointer">
              <input
                type="checkbox"
                checked={showReadyOnly}
                onChange={(e) => setShowReadyOnly(e.target.checked)}
                className="rounded border-border"
              />
              Show approved only
            </label>
          </div>
          
          <div className="flex-1 overflow-auto p-4">
            <p className="text-xs text-text-muted mb-3">
              {draggedDoc 
                ? <span className="text-accent-green">Dragging: {draggedDoc.shortTitle || draggedDoc.title} — drop on a CTD slot</span>
                : 'Drag documents to CTD slots or click to assign'
              }
            </p>
            <div className="space-y-2">
              {filteredDocuments.map(doc => (
                <div
                  key={doc.id}
                  draggable={doc.isReady}
                  onDragStart={() => doc.isReady && handleDragStart(doc)}
                  onDragEnd={handleDragEnd}
                  className={`p-3 rounded-lg border transition-all ${
                    draggedDoc?.id === doc.id
                      ? 'bg-accent-green/20 border-accent-green scale-[0.98] opacity-75'
                      : doc.isReady 
                        ? 'bg-surface-card border-border hover:border-accent-green/50 cursor-grab active:cursor-grabbing' 
                        : 'bg-surface border-border/50 opacity-75'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-text-primary truncate">{doc.shortTitle || doc.title}</div>
                      <div className="text-xs text-text-muted truncate">{doc.productName}</div>
                    </div>
                    {doc.isReady ? (
                      <CheckCircle className="w-4 h-4 text-accent-green flex-shrink-0" />
                    ) : (
                      <Clock className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border ${getStatusColor(doc.status)}`}>
                        {doc.status.replace(/-/g, ' ')}
                      </span>
                      {/* v0.14.5: Document Lineage Provenance */}
                      <SubmissionsProvenanceIndicator
                        documentId={doc.id}
                        documentVersion={doc.version}
                        documentTitle={doc.title}
                        isFrozen={doc.status === 'submission-ready'}
                      />
                    </div>
                    <span className="text-[10px] text-text-muted">
                      M{doc.module}
                    </span>
                  </div>
                  
                  {!doc.isReady && (
                    <div className="mt-2">
                      <div className="flex items-center justify-between text-[10px] text-text-muted mb-1">
                        <span>Progress</span>
                        <span>{doc.progress}%</span>
                      </div>
                      <div className="h-1 bg-surface rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-amber-400"
                          style={{ width: `${doc.progress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
              
              {filteredDocuments.length === 0 && (
                <div className="text-center py-8 text-text-muted">
                  <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No documents found</p>
                </div>
              )}
            </div>
          </div>
          
          {/* R&D Connected Context Panel */}
          <RDConnectedContextPanel
            selectedSection={selectedSection}
            productId="lig-2847"
            onNavigate={(module, path) => {
              toast.info(`Navigate to ${path}`);
            }}
          />
          
          <div className="p-4 border-t border-border space-y-2">
            <button 
              onClick={() => toast.info('Navigate to Authoring module to create documents')}
              className="w-full py-2 text-sm bg-accent-blue/10 border border-accent-blue/30 text-accent-blue rounded-lg hover:bg-accent-blue/20 flex items-center justify-center gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              Open Authoring
            </button>
            <button className="w-full py-2 text-sm bg-surface-card border border-border text-text-primary rounded-lg hover:bg-surface flex items-center justify-center gap-2">
              <Upload className="w-4 h-4" />
              Upload Document
            </button>
          </div>
        </div>
      </div>
      
      {/* Document Picker Modal */}
      {showDocumentPicker && activeSlot && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-surface-elevated rounded-xl w-[600px] max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-text-primary">Assign Document</h3>
                <p className="text-sm text-text-muted">
                  Section {activeSlot.sectionNumber} - {activeSlot.sectionTitle}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowDocumentPicker(false);
                  setActiveSlot(null);
                }}
                className="text-text-muted hover:text-text-primary"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 max-h-96 overflow-auto">
              <div className="space-y-2">
                {availableDocuments.map(doc => (
                  <button
                    key={doc.id}
                    onClick={() => handleAssignDocument(activeSlot, doc)}
                    className="w-full p-3 bg-surface-card rounded-lg border border-border hover:border-accent-blue text-left transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-text-primary">{doc.title}</div>
                        <div className="text-xs text-text-muted">
                          {doc.type.toUpperCase()} • Module {doc.module}
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-text-muted" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
