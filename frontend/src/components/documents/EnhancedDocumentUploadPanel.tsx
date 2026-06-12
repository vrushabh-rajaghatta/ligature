
// Enhanced Document Upload Panel - v0.25.9
// Requires minimum metadata and uses AI to auto-suggest 80%+ of fields
// Prevents upload to 'General' folder without explicit confirmation


import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import {
  Upload, X, FileText, File, FileSpreadsheet, FileCode, Image,
  CheckCircle, AlertCircle, Loader2, Trash2, FolderOpen,
  ChevronDown, Info, RefreshCw, Pause, Play, XCircle,
  Archive, Clock, Plus, GitBranch, Sparkles, AlertTriangle, Check,
  Brain, Wand2, Shield, Tag,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { 
  suggestDocumentMetadata, 
  validateDocumentMetadata,
  aiMetadataSuggestionService,
  type SuggestedMetadata,
  type DocumentCategory,
  type DocumentType,
  type SecurityClassification,
  type MetadataValidation,
} from '@/services/ai-metadata-suggestion-service';

// =============================================================================
// TYPES
// =============================================================================

export type UploadContext = 'tmf' | 'ectd' | 'safety' | 'authoring' | 'qms' | 'general';

export type UploadFileStatus = 
  | 'queued' 
  | 'analyzing'  // New: AI is analyzing metadata
  | 'validating' 
  | 'awaiting-metadata' // New: Waiting for user to confirm/edit metadata
  | 'uploading' 
  | 'processing' 
  | 'complete' 
  | 'error' 
  | 'cancelled';

export interface UploadFile {
  id: string;
  file: File;
  status: UploadFileStatus;
  progress: number;
  error?: string;
  result?: UploadResult;
  validationErrors?: string[];
  startedAt?: Date;
  completedAt?: Date;
  // AI-suggested metadata
  suggestedMetadata?: SuggestedMetadata;
  // User-confirmed metadata
  confirmedMetadata?: SuggestedMetadata;
  // Metadata validation
  metadataValidation?: MetadataValidation;
}

export interface UploadResult {
  success: boolean;
  fileId: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  checksum: string;
  uploadedAt: string;
  cloudUrl?: string;
  storageProvider: 'r2' | 'local' | 'none';
  metadata?: SuggestedMetadata;
}

export interface EnhancedDocumentUploadPanelProps {
  /** Upload context for categorization */
  context?: UploadContext;
  /** If provided, uploads will be linked to this document as new versions */
  linkedDocumentId?: string;
  /** Linked document title for display */
  linkedDocumentTitle?: string;
  /** Pre-fill product name */
  productName?: string;
  /** Pre-fill study ID */
  studyId?: string;
  /** Callback when uploads complete */
  onUploadComplete?: (results: UploadResult[]) => void;
  /** Callback when a single file completes */
  onFileComplete?: (result: UploadResult) => void;
  /** Callback when all uploads finish */
  onAllComplete?: () => void;
  /** Callback to close panel */
  onClose?: () => void;
  /** Whether panel is in modal mode */
  isModal?: boolean;
  /** Max files per batch (default: 20) */
  maxFiles?: number;
  /** Max file size in bytes (default: 50MB) */
  maxFileSize?: number;
  /** Allowed file types (default: common document types) */
  allowedTypes?: string[];
  /** Require metadata before upload (default: true) */
  requireMetadata?: boolean;
  /** Block 'General' category without confirmation (default: true) */
  blockGeneralCategory?: boolean;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const CONTEXT_OPTIONS: { value: UploadContext; label: string; description: string; icon: React.ReactNode }[] = [
  { value: 'ectd', label: 'eCTD Submission', description: 'Regulatory submission documents', icon: <FileText className="w-4 h-4" /> },
  { value: 'tmf', label: 'Trial Master File', description: 'Clinical trial documents', icon: <Archive className="w-4 h-4" /> },
  { value: 'safety', label: 'Safety/PV', description: 'Pharmacovigilance documents', icon: <AlertCircle className="w-4 h-4" /> },
  { value: 'authoring', label: 'Document Authoring', description: 'Documents for authoring workflow', icon: <FileText className="w-4 h-4" /> },
  { value: 'qms', label: 'Quality Management', description: 'Quality system documents', icon: <CheckCircle className="w-4 h-4" /> },
  { value: 'general', label: 'General', description: 'Uncategorized (not recommended)', icon: <FolderOpen className="w-4 h-4 text-amber-500" /> },
];

const DEFAULT_ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/plain',
  'text/csv',
  'text/xml',
  'application/xml',
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/tiff',
  'application/zip',
];

const DEFAULT_MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const DEFAULT_MAX_FILES = 20;

// =============================================================================
// HELPERS
// =============================================================================

function generateId(): string {
  return `upload_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(mimeType: string): React.ReactNode {
  if (mimeType === 'application/pdf') return <File className="w-5 h-5 text-red-400" />;
  if (mimeType.includes('word') || mimeType.includes('document')) return <FileText className="w-5 h-5 text-accent-blue" />;
  if (mimeType.includes('sheet') || mimeType.includes('excel')) return <FileSpreadsheet className="w-5 h-5 text-green-400" />;
  if (mimeType.includes('xml')) return <FileCode className="w-5 h-5 text-purple-400" />;
  if (mimeType.startsWith('image/')) return <Image className="w-5 h-5 text-accent-teal" />;
  return <FileText className="w-5 h-5 text-text-muted" />;
}

function getStatusIcon(status: UploadFileStatus): React.ReactNode {
  switch (status) {
    case 'queued': return <Clock className="w-4 h-4 text-text-muted" />;
    case 'analyzing': return <Brain className="w-4 h-4 text-accent-purple animate-pulse" />;
    case 'awaiting-metadata': return <AlertTriangle className="w-4 h-4 text-amber-400" />;
    case 'validating': return <Loader2 className="w-4 h-4 text-accent-blue animate-spin" />;
    case 'uploading': return <Loader2 className="w-4 h-4 text-accent-teal animate-spin" />;
    case 'processing': return <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />;
    case 'complete': return <CheckCircle className="w-4 h-4 text-status-success" />;
    case 'error': return <XCircle className="w-4 h-4 text-status-error" />;
    case 'cancelled': return <X className="w-4 h-4 text-text-muted" />;
  }
}

function getStatusLabel(status: UploadFileStatus): string {
  switch (status) {
    case 'queued': return 'Queued';
    case 'analyzing': return 'AI Analyzing...';
    case 'awaiting-metadata': return 'Review Metadata';
    case 'validating': return 'Validating...';
    case 'uploading': return 'Uploading...';
    case 'processing': return 'Processing...';
    case 'complete': return 'Complete';
    case 'error': return 'Failed';
    case 'cancelled': return 'Cancelled';
  }
}

function getConfidenceColor(confidence: number): string {
  if (confidence >= 80) return 'text-green-400';
  if (confidence >= 60) return 'text-amber-400';
  return 'text-red-400';
}

// =============================================================================
// METADATA EDITOR COMPONENT
// =============================================================================

interface MetadataEditorProps {
  file: UploadFile;
  onConfirm: (metadata: SuggestedMetadata) => void;
  onCancel: () => void;
  blockGeneralCategory?: boolean;
  existingContext?: {
    productName?: string;
    studyId?: string;
  };
}

function MetadataEditor({ file, onConfirm, onCancel, blockGeneralCategory = true, existingContext }: MetadataEditorProps) {
  const suggested = file.suggestedMetadata;
  
  const [title, setTitle] = useState(suggested?.title || file.file.name.replace(/\.[^.]+$/, ''));
  const [category, setCategory] = useState<DocumentCategory>(suggested?.category || 'general');
  const [documentType, setDocumentType] = useState<DocumentType>(suggested?.documentType || 'other');
  const [context, setContext] = useState<UploadContext>(suggested?.context || 'general');
  const [securityClassification, setSecurityClassification] = useState<SecurityClassification>(
    suggested?.securityClassification || 'internal'
  );
  const [productName, setProductName] = useState(existingContext?.productName || suggested?.productName || '');
  const [studyId, setStudyId] = useState(existingContext?.studyId || suggested?.studyId || '');
  const [ctdSection, setCtdSection] = useState(suggested?.ctdSection || '');
  const [showGeneralWarning, setShowGeneralWarning] = useState(false);
  const [acknowledgedGeneral, setAcknowledgedGeneral] = useState(false);
  
  const categories = aiMetadataSuggestionService.getAllCategories();
  const documentTypes = aiMetadataSuggestionService.getAllDocumentTypes();
  
  const validation = useMemo(() => {
    return validateDocumentMetadata({
      title,
      category,
      documentType,
      securityClassification,
      productName,
      studyId,
    });
  }, [title, category, documentType, securityClassification, productName, studyId]);
  
  const canConfirm = useMemo(() => {
    if (!title.trim()) return false;
    if (blockGeneralCategory && category === 'general' && !acknowledgedGeneral) return false;
    if (!documentType) return false;
    if (!securityClassification) return false;
    return true;
  }, [title, category, documentType, securityClassification, blockGeneralCategory, acknowledgedGeneral]);
  
  const handleCategoryChange = (newCategory: DocumentCategory) => {
    setCategory(newCategory);
    if (newCategory === 'general' && blockGeneralCategory) {
      setShowGeneralWarning(true);
    } else {
      setShowGeneralWarning(false);
      setAcknowledgedGeneral(false);
    }
  };
  
  const handleConfirm = () => {
    const metadata: SuggestedMetadata = {
      title,
      category,
      documentType,
      context,
      securityClassification,
      productName: productName || undefined,
      studyId: studyId || undefined,
      ctdSection: ctdSection || undefined,
      confidence: { overall: 100, category: 100, documentType: 100, context: 100 },
      reasoning: ['User confirmed metadata'],
      suggestedTags: suggested?.suggestedTags || [],
    };
    onConfirm(metadata);
  };
  
  return (
    <div className="border border-border rounded-lg bg-surface-card overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-surface border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          {getFileIcon(file.file.type)}
          <div>
            <div className="text-sm font-medium text-text-primary">{file.file.name}</div>
            <div className="text-xs text-text-muted">{formatFileSize(file.file.size)}</div>
          </div>
        </div>
        {suggested && (
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-accent-purple" />
            <span className={`text-xs font-medium ${getConfidenceColor(suggested.confidence.overall)}`}>
              {suggested.confidence.overall}% AI Confidence
            </span>
          </div>
        )}
      </div>
      
      {/* AI Reasoning */}
      {suggested?.reasoning && suggested.reasoning.length > 0 && (
        <div className="px-4 py-2 bg-accent-purple/5 border-b border-accent-purple/20">
          <div className="flex items-start gap-2">
            <Brain className="w-4 h-4 text-accent-purple mt-0.5 flex-shrink-0" />
            <div className="text-xs text-text-secondary">
              <span className="font-medium text-accent-purple">AI Analysis: </span>
              {suggested.reasoning.join(' • ')}
            </div>
          </div>
        </div>
      )}
      
      {/* Metadata Form */}
      <div className="p-4 space-y-4">
        {/* Title */}
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">
            Document Title <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-blue"
            placeholder="Enter document title..."
          />
        </div>
        
        {/* Category and Document Type - Two columns */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">
              Category <span className="text-red-400">*</span>
            </label>
            <select
              value={category}
              onChange={(e) => handleCategoryChange(e.target.value as DocumentCategory)}
              className={`w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-blue ${
                category === 'general' ? 'border-amber-500/50' : ''
              }`}
            >
              {categories.map(cat => (
                <option key={cat.value} value={cat.value}>
                  {cat.label} {cat.value === 'general' ? '(Not Recommended)' : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">
              Document Type <span className="text-red-400">*</span>
            </label>
            <select
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value as DocumentType)}
              className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-blue"
            >
              {documentTypes.map(dt => (
                <option key={dt.value} value={dt.value}>{dt.label}</option>
              ))}
            </select>
          </div>
        </div>
        
        {/* General Category Warning */}
        {showGeneralWarning && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-400">General Category Not Recommended</p>
                <p className="text-xs text-text-secondary mt-1">
                  Documents in the General folder may not be properly tracked for compliance, 
                  regulatory submissions, or quality management. This can create audit and compliance risks.
                </p>
                <label className="flex items-center gap-2 mt-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={acknowledgedGeneral}
                    onChange={(e) => setAcknowledgedGeneral(e.target.checked)}
                    className="w-4 h-4 rounded border-border text-accent-blue focus:ring-accent-blue"
                  />
                  <span className="text-xs text-text-secondary">
                    I understand the risks and want to proceed with General category
                  </span>
                </label>
              </div>
            </div>
          </div>
        )}
        
        {/* Context and Security - Two columns */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">
              Upload Context
            </label>
            <select
              value={context}
              onChange={(e) => setContext(e.target.value as UploadContext)}
              className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-blue"
            >
              {CONTEXT_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">
              Security Classification <span className="text-red-400">*</span>
            </label>
            <select
              value={securityClassification}
              onChange={(e) => setSecurityClassification(e.target.value as SecurityClassification)}
              className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-blue"
            >
              <option value="public">Public</option>
              <option value="internal">Internal</option>
              <option value="confidential">Confidential</option>
              <option value="restricted">Restricted</option>
            </select>
          </div>
        </div>
        
        {/* Product and Study - Two columns */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">
              Product Name
              {category !== 'quality' && category !== 'administrative' && (
                <span className="text-amber-400 ml-1">(Recommended)</span>
              )}
            </label>
            <input
              type="text"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-blue"
              placeholder="e.g., LIG-2847"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">
              Study ID
            </label>
            <input
              type="text"
              value={studyId}
              onChange={(e) => setStudyId(e.target.value)}
              className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-blue"
              placeholder="e.g., LIG-RA-301"
            />
          </div>
        </div>
        
        {/* CTD Section (if eCTD context) */}
        {context === 'ectd' && (
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">
              CTD Section
            </label>
            <input
              type="text"
              value={ctdSection}
              onChange={(e) => setCtdSection(e.target.value)}
              className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-blue"
              placeholder="e.g., 2.5, 3.2.P.2, 5.3.5"
            />
          </div>
        )}
        
        {/* Suggested Tags */}
        {suggested?.suggestedTags && suggested.suggestedTags.length > 0 && (
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">
              Suggested Tags
            </label>
            <div className="flex flex-wrap gap-1.5">
              {suggested.suggestedTags.map((tag, idx) => (
                <Badge key={idx} color="blue" size="xs">
                  <Tag className="w-3 h-3 mr-1" />
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}
        
        {/* Validation Messages */}
        {!validation.isValid && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
            <div className="flex items-start gap-2">
              <XCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-red-400">
                <span className="font-medium">Missing required fields: </span>
                {validation.missingRequired.join(', ')}
              </div>
            </div>
          </div>
        )}
        
        {validation.warnings.length > 0 && validation.isValid && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-amber-400">
                {validation.warnings.map((w, i) => <div key={i}>{w}</div>)}
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Actions */}
      <div className="px-4 py-3 bg-surface border-t border-border flex items-center justify-between">
        <button
          onClick={onCancel}
          className="px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors"
        >
          Remove File
        </button>
        <Button
          variant="primary"
          size="sm"
          icon={<Check className="w-4 h-4" />}
          onClick={handleConfirm}
          disabled={!canConfirm}
        >
          Confirm Metadata
        </Button>
      </div>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function EnhancedDocumentUploadPanel({
  context: initialContext = 'ectd',
  linkedDocumentId,
  linkedDocumentTitle,
  productName: initialProductName,
  studyId: initialStudyId,
  onUploadComplete,
  onFileComplete,
  onAllComplete,
  onClose,
  isModal = false,
  maxFiles = DEFAULT_MAX_FILES,
  maxFileSize = DEFAULT_MAX_FILE_SIZE,
  allowedTypes = DEFAULT_ALLOWED_TYPES,
  requireMetadata = true,
  blockGeneralCategory = true,
}: EnhancedDocumentUploadPanelProps) {
  // State
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [context, setContext] = useState<UploadContext>(initialContext);
  const [showContextDropdown, setShowContextDropdown] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [uploadAsNewVersion, setUploadAsNewVersion] = useState(!!linkedDocumentId);
  const [editingFileId, setEditingFileId] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  
  // Computed
  const stats = useMemo(() => {
    const total = files.length;
    const completed = files.filter(f => f.status === 'complete').length;
    const failed = files.filter(f => f.status === 'error').length;
    const awaitingMetadata = files.filter(f => f.status === 'awaiting-metadata').length;
    const pending = files.filter(f => ['queued', 'analyzing', 'validating', 'uploading', 'processing'].includes(f.status)).length;
    const readyToUpload = files.filter(f => f.confirmedMetadata && f.status === 'awaiting-metadata').length;
    const totalSize = files.reduce((acc, f) => acc + f.file.size, 0);
    const uploadedSize = files.reduce((acc, f) => {
      if (f.status === 'complete') return acc + f.file.size;
      if (f.status === 'uploading') return acc + (f.file.size * f.progress / 100);
      return acc;
    }, 0);
    const overallProgress = totalSize > 0 ? Math.round((uploadedSize / totalSize) * 100) : 0;
    
    return { total, completed, failed, awaitingMetadata, pending, readyToUpload, totalSize, uploadedSize, overallProgress };
  }, [files]);
  
  const hasQueuedFiles = files.some(f => f.confirmedMetadata && f.status === 'awaiting-metadata');
  const hasActiveUploads = files.some(f => ['analyzing', 'validating', 'uploading', 'processing'].includes(f.status));
  
  // Validation
  const validateFile = useCallback((file: File): string[] => {
    const errors: string[] = [];
    
    if (file.size > maxFileSize) {
      errors.push(`File exceeds maximum size of ${formatFileSize(maxFileSize)}`);
    }
    
    if (!allowedTypes.includes(file.type)) {
      errors.push(`File type "${file.type || 'unknown'}" is not allowed`);
    }
    
    return errors;
  }, [maxFileSize, allowedTypes]);
  
  // Add files to queue and analyze with AI
  const addFiles = useCallback(async (newFiles: FileList | File[]) => {
    const fileArray = Array.from(newFiles);
    const remainingSlots = maxFiles - files.length;
    
    if (fileArray.length > remainingSlots) {
      fileArray.splice(remainingSlots);
    }
    
    // Create upload files
    const uploadFiles: UploadFile[] = fileArray.map(file => {
      const validationErrors = validateFile(file);
      return {
        id: generateId(),
        file,
        status: validationErrors.length > 0 ? 'error' : 'analyzing',
        progress: 0,
        validationErrors: validationErrors.length > 0 ? validationErrors : undefined,
      };
    });
    
    setFiles(prev => [...prev, ...uploadFiles]);
    
    // Analyze each file with AI
    for (const uploadFile of uploadFiles) {
      if (uploadFile.status === 'analyzing') {
        try {
          // Simulate AI analysis delay
          await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
          
          const suggestedMetadata = await suggestDocumentMetadata(uploadFile.file, {
            context,
            productName: initialProductName,
            studyId: initialStudyId,
          });
          
          setFiles(prev => prev.map(f => 
            f.id === uploadFile.id 
              ? { 
                  ...f, 
                  status: 'awaiting-metadata' as UploadFileStatus,
                  suggestedMetadata,
                  // Auto-confirm if high confidence and not general category
                  confirmedMetadata: (
                    !requireMetadata && 
                    suggestedMetadata.confidence.overall >= 85 && 
                    suggestedMetadata.category !== 'general'
                  ) ? suggestedMetadata : undefined,
                } 
              : f
          ));
        } catch (error) {
          setFiles(prev => prev.map(f => 
            f.id === uploadFile.id 
              ? { 
                  ...f, 
                  status: 'awaiting-metadata' as UploadFileStatus,
                  error: 'AI analysis failed - please enter metadata manually',
                } 
              : f
          ));
        }
      }
    }
  }, [files.length, maxFiles, validateFile, context, initialProductName, initialStudyId, requireMetadata]);
  
  // Confirm metadata for a file
  const confirmMetadata = useCallback((fileId: string, metadata: SuggestedMetadata) => {
    setFiles(prev => prev.map(f => 
      f.id === fileId 
        ? { ...f, confirmedMetadata: metadata, error: undefined } 
        : f
    ));
    setEditingFileId(null);
  }, []);
  
  // Remove file from queue
  const removeFile = useCallback((id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
    if (editingFileId === id) setEditingFileId(null);
  }, [editingFileId]);
  
  // Clear all files
  const clearAll = useCallback(() => {
    setFiles([]);
    setEditingFileId(null);
  }, []);
  
  // Clear completed files
  const clearCompleted = useCallback(() => {
    setFiles(prev => prev.filter(f => f.status !== 'complete'));
  }, []);
  
  // Upload a single file
  const uploadFile = useCallback(async (uploadFile: UploadFile): Promise<void> => {
    if (!uploadFile.confirmedMetadata) return;
    
    // Update status to validating
    setFiles(prev => prev.map(f => 
      f.id === uploadFile.id ? { ...f, status: 'validating' as UploadFileStatus, startedAt: new Date() } : f
    ));
    
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Update status to uploading
    setFiles(prev => prev.map(f => 
      f.id === uploadFile.id ? { ...f, status: 'uploading' as UploadFileStatus } : f
    ));
    
    try {
      const formData = new FormData();
      formData.append('file', uploadFile.file);
      formData.append('context', uploadFile.confirmedMetadata.context);
      formData.append('metadata', JSON.stringify(uploadFile.confirmedMetadata));
      if (linkedDocumentId && uploadAsNewVersion) {
        formData.append('documentId', linkedDocumentId);
      }
      
      // Simulate upload progress
      for (let progress = 0; progress <= 100; progress += 20) {
        await new Promise(resolve => setTimeout(resolve, 100));
        setFiles(prev => prev.map(f => 
          f.id === uploadFile.id ? { ...f, progress } : f
        ));
      }
      
      // Simulate processing
      setFiles(prev => prev.map(f => 
        f.id === uploadFile.id ? { ...f, status: 'processing' as UploadFileStatus, progress: 100 } : f
      ));
      
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Create result
      const result: UploadResult = {
        success: true,
        fileId: generateId(),
        fileName: uploadFile.file.name,
        filePath: `/uploads/${uploadFile.confirmedMetadata.context}/${uploadFile.file.name}`,
        fileSize: uploadFile.file.size,
        mimeType: uploadFile.file.type,
        checksum: 'sha256:' + Math.random().toString(36).substring(2, 15),
        uploadedAt: new Date().toISOString(),
        storageProvider: 'r2',
        metadata: uploadFile.confirmedMetadata,
      };
      
      // Complete
      setFiles(prev => prev.map(f => 
        f.id === uploadFile.id ? { 
          ...f, 
          status: 'complete' as UploadFileStatus, 
          progress: 100, 
          result,
          completedAt: new Date()
        } : f
      ));
      
      onFileComplete?.(result);
      
    } catch (error) {
      setFiles(prev => prev.map(f => 
        f.id === uploadFile.id ? { 
          ...f, 
          status: 'error' as UploadFileStatus, 
          error: error instanceof Error ? error.message : 'Upload failed',
          completedAt: new Date()
        } : f
      ));
    }
  }, [linkedDocumentId, uploadAsNewVersion, onFileComplete]);
  
  // Start upload process
  const startUpload = useCallback(async () => {
    const readyFiles = files.filter(f => f.confirmedMetadata && f.status === 'awaiting-metadata');
    if (readyFiles.length === 0) return;
    
    setIsUploading(true);
    setIsPaused(false);
    
    const results: UploadResult[] = [];
    
    for (const file of readyFiles) {
      if (isPaused) break;
      await uploadFile(file);
      const updatedFile = files.find(f => f.id === file.id);
      if (updatedFile?.result) {
        results.push(updatedFile.result);
      }
    }
    
    setIsUploading(false);
    
    if (results.length > 0) {
      onUploadComplete?.(results);
    }
    
    const allComplete = files.every(f => f.status === 'complete' || f.status === 'error');
    if (allComplete) {
      onAllComplete?.();
    }
  }, [files, isPaused, uploadFile, onUploadComplete, onAllComplete]);
  
  // Drag and drop handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);
  
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!dropZoneRef.current?.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  }, []);
  
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);
  
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
  }, [addFiles]);
  
  return (
    <div className={`flex flex-col ${isModal ? 'h-full' : 'min-h-[400px]'} bg-surface-card border border-border rounded-xl`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-accent-blue/10 rounded-lg">
            <Upload className="w-5 h-5 text-accent-blue" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-text-primary">Document Upload</h3>
            <p className="text-xs text-text-muted">AI-powered metadata suggestion</p>
          </div>
        </div>
        
        {onClose && (
          <button onClick={onClose} className="p-2 hover:bg-surface rounded-lg transition-colors">
            <X className="w-5 h-5 text-text-muted" />
          </button>
        )}
      </div>
      
      {/* AI Info Banner */}
      <div className="mx-4 mt-4 p-3 bg-accent-purple/10 border border-accent-purple/30 rounded-lg flex items-start gap-3">
        <Sparkles className="w-5 h-5 text-accent-purple mt-0.5 flex-shrink-0" />
        <div>
          <div className="text-sm font-medium text-accent-purple">AI-Powered Metadata Suggestion</div>
          <p className="text-xs text-text-muted mt-0.5">
            Files will be automatically analyzed to suggest category, document type, CTD section, and more.
            Review and confirm metadata before upload to ensure proper categorization.
          </p>
        </div>
      </div>
      
      {/* Drop Zone */}
      <div className="flex-shrink-0 px-4 pt-4">
        <div
          ref={dropZoneRef}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className={`
            border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer
            ${isDragging 
              ? 'border-accent-blue bg-accent-blue/10' 
              : 'border-border hover:border-accent-blue/50 hover:bg-surface'
            }
          `}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={allowedTypes.join(',')}
            onChange={(e) => e.target.files && addFiles(e.target.files)}
            className="hidden"
          />
          
          <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-3 transition-colors ${
            isDragging ? 'bg-accent-blue/20' : 'bg-surface'
          }`}>
            <Upload className={`w-6 h-6 ${isDragging ? 'text-accent-blue' : 'text-text-muted'}`} />
          </div>
          
          <p className="text-sm font-medium text-text-primary">
            {isDragging ? 'Drop files here' : 'Drag & drop files here'}
          </p>
          <p className="text-xs text-text-muted mt-1">
            or click to browse • PDF, Word, Excel, Images
          </p>
        </div>
      </div>
      
      {/* File Queue */}
      {files.length > 0 && (
        <div className="flex-1 flex flex-col min-h-0 mt-4 border-t border-border">
          {/* Queue Header */}
          <div className="flex items-center justify-between px-4 py-2 bg-surface/50 border-b border-border">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-text-primary">
                {stats.total} file{stats.total !== 1 ? 's' : ''}
              </span>
              <span className="text-xs text-text-muted">
                {formatFileSize(stats.totalSize)}
              </span>
              {stats.awaitingMetadata > 0 && (
                <Badge color="amber" size="xs">{stats.awaitingMetadata} need review</Badge>
              )}
              {stats.completed > 0 && (
                <Badge color="green" size="xs">{stats.completed} complete</Badge>
              )}
              {stats.failed > 0 && (
                <Badge color="red" size="xs">{stats.failed} failed</Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              {stats.completed > 0 && (
                <button
                  onClick={clearCompleted}
                  className="text-xs text-text-muted hover:text-text-secondary transition-colors"
                >
                  Clear completed
                </button>
              )}
              <button
                onClick={clearAll}
                className="text-xs text-status-error hover:text-red-400 transition-colors"
              >
                Clear all
              </button>
            </div>
          </div>
          
          {/* Overall Progress */}
          {isUploading && (
            <div className="px-4 py-2 bg-accent-teal/5 border-b border-border">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-text-muted">Overall progress</span>
                <span className="text-xs font-medium text-accent-teal">{stats.overallProgress}%</span>
              </div>
              <div className="h-1.5 bg-surface rounded-full overflow-hidden">
                <div 
                  className="h-full bg-accent-teal transition-all duration-300"
                  style={{ width: `${stats.overallProgress}%` }}
                />
              </div>
            </div>
          )}
          
          {/* File List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {files.map(file => (
              <div key={file.id}>
                {/* File being edited */}
                {(editingFileId === file.id || (file.status === 'awaiting-metadata' && !file.confirmedMetadata)) ? (
                  <MetadataEditor
                    file={file}
                    onConfirm={(metadata) => confirmMetadata(file.id, metadata)}
                    onCancel={() => removeFile(file.id)}
                    blockGeneralCategory={blockGeneralCategory}
                    existingContext={{ productName: initialProductName, studyId: initialStudyId }}
                  />
                ) : (
                  /* File card */
                  <div 
                    className={`
                      flex items-center gap-3 p-3 rounded-lg border transition-colors
                      ${file.status === 'complete' ? 'bg-status-success/5 border-status-success/20' : ''}
                      ${file.status === 'error' ? 'bg-status-error/5 border-status-error/20' : ''}
                      ${file.status === 'awaiting-metadata' && file.confirmedMetadata ? 'bg-accent-blue/5 border-accent-blue/20' : ''}
                      ${['queued', 'analyzing', 'validating', 'uploading', 'processing'].includes(file.status) ? 'bg-surface-card border-border' : ''}
                      ${file.status === 'cancelled' ? 'bg-surface/50 border-border opacity-50' : ''}
                    `}
                  >
                    {/* File Icon */}
                    <div className="flex-shrink-0">
                      {getFileIcon(file.file.type)}
                    </div>
                    
                    {/* File Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-text-primary truncate">
                          {file.confirmedMetadata?.title || file.file.name}
                        </span>
                        <span className="text-xs text-text-muted flex-shrink-0">
                          {formatFileSize(file.file.size)}
                        </span>
                      </div>
                      
                      {/* Metadata summary */}
                      {file.confirmedMetadata && (
                        <div className="flex items-center gap-2 mt-1">
                          <Badge color="blue" size="xs">
                            {aiMetadataSuggestionService.getCategoryLabel(file.confirmedMetadata.category)}
                          </Badge>
                          <Badge color="slate" size="xs">
                            {aiMetadataSuggestionService.getDocumentTypeLabel(file.confirmedMetadata.documentType)}
                          </Badge>
                          {file.confirmedMetadata.productName && (
                            <span className="text-xs text-text-muted">{file.confirmedMetadata.productName}</span>
                          )}
                        </div>
                      )}
                      
                      {/* Progress Bar */}
                      {['uploading', 'processing'].includes(file.status) && (
                        <div className="mt-1.5">
                          <div className="h-1 bg-surface rounded-full overflow-hidden">
                            <div 
                              className={`h-full transition-all duration-300 ${file.status === 'processing' ? 'bg-amber-400' : 'bg-accent-teal'}`}
                              style={{ width: `${file.progress}%` }}
                            />
                          </div>
                        </div>
                      )}
                      
                      {/* Error Message */}
                      {file.error && (
                        <p className="text-xs text-status-error mt-1">{file.error}</p>
                      )}
                    </div>
                    
                    {/* Status & Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="flex items-center gap-1.5">
                        {getStatusIcon(file.status)}
                        <span className={`text-xs ${
                          file.status === 'complete' ? 'text-status-success' : 
                          file.status === 'error' ? 'text-status-error' : 
                          file.status === 'awaiting-metadata' ? 'text-amber-400' :
                          'text-text-muted'
                        }`}>
                          {getStatusLabel(file.status)}
                        </span>
                      </div>
                      
                      {/* Edit metadata button */}
                      {file.status === 'awaiting-metadata' && file.confirmedMetadata && (
                        <button
                          onClick={() => setEditingFileId(file.id)}
                          className="p-1 hover:bg-surface rounded transition-colors"
                          title="Edit metadata"
                        >
                          <Wand2 className="w-4 h-4 text-text-muted hover:text-accent-blue" />
                        </button>
                      )}
                      
                      {/* Remove button */}
                      {['awaiting-metadata', 'error', 'complete', 'cancelled'].includes(file.status) && (
                        <button
                          onClick={() => removeFile(file.id)}
                          className="p-1 hover:bg-surface rounded transition-colors"
                          title="Remove"
                        >
                          <Trash2 className="w-4 h-4 text-text-muted hover:text-status-error" />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Footer Actions */}
      <div className="flex items-center justify-between p-4 border-t border-border bg-surface/50">
        <div className="flex items-center gap-2 text-xs text-text-muted">
          <Shield className="w-4 h-4" />
          <span>Metadata required before upload</span>
        </div>
        
        <div className="flex items-center gap-2">
          {onClose && (
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
          )}
          
          {hasActiveUploads && (
            <Button
              variant="secondary"
              icon={isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
              onClick={() => setIsPaused(!isPaused)}
            >
              {isPaused ? 'Resume' : 'Pause'}
            </Button>
          )}
          
          <Button
            variant="primary"
            icon={isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            onClick={startUpload}
            disabled={!hasQueuedFiles || isUploading}
          >
            {isUploading 
              ? `Uploading...` 
              : hasQueuedFiles 
                ? `Upload ${stats.readyToUpload} File${stats.readyToUpload !== 1 ? 's' : ''}`
                : stats.awaitingMetadata > 0
                  ? 'Review Metadata First'
                  : 'Select Files'
            }
          </Button>
        </div>
      </div>
    </div>
  );
}

export default EnhancedDocumentUploadPanel;
