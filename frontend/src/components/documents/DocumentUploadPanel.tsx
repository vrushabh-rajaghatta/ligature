

/**
 * DocumentUploadPanel - Comprehensive document upload interface
 * 
 * Features:
 * - Drag-and-drop dropzone with visual feedback
 * - Multi-file batch upload support
 * - File type & size validation with clear error messages
 * - Upload progress indicators (per file & overall)
 * - Preview queue with remove option
 * - Context selector (TMF, eCTD, Safety, Authoring, QMS)
 * - "Upload as new version" toggle when a document is selected
 * - Integration with /api/upload endpoint
 * 
 * @version 0.13.41
 */

import React, { useState, useCallback, useRef, useMemo } from 'react';
import {
  Upload, X, FileText, File, FileSpreadsheet, FileCode, Image,
  CheckCircle, AlertCircle, Loader2, Trash2, FolderOpen,
  ChevronDown, Info, RefreshCw, Pause, Play, XCircle,
  Archive, Clock, Plus, GitBranch
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

// =============================================================================
// TYPES
// =============================================================================

export type UploadContext = 'tmf' | 'ectd' | 'safety' | 'authoring' | 'qms' | 'general';

export type UploadFileStatus = 
  | 'queued' 
  | 'validating' 
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
}

export interface DocumentUploadPanelProps {
  /** Upload context for categorization */
  context?: UploadContext;
  /** If provided, uploads will be linked to this document as new versions */
  linkedDocumentId?: string;
  /** Linked document title for display */
  linkedDocumentTitle?: string;
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
}

// =============================================================================
// CONSTANTS
// =============================================================================

const CONTEXT_OPTIONS: { value: UploadContext; label: string; description: string; icon: React.ReactNode }[] = [
  { value: 'general', label: 'General', description: 'General purpose uploads', icon: <FolderOpen className="w-4 h-4" /> },
  { value: 'tmf', label: 'Trial Master File', description: 'Clinical trial documents', icon: <Archive className="w-4 h-4" /> },
  { value: 'ectd', label: 'eCTD Submission', description: 'Regulatory submission documents', icon: <FileText className="w-4 h-4" /> },
  { value: 'safety', label: 'Safety/PV', description: 'Pharmacovigilance documents', icon: <AlertCircle className="w-4 h-4" /> },
  { value: 'authoring', label: 'Document Authoring', description: 'Documents for authoring workflow', icon: <FileText className="w-4 h-4" /> },
  { value: 'qms', label: 'Quality Management', description: 'Quality system documents', icon: <CheckCircle className="w-4 h-4" /> },
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
    case 'validating': return 'Validating...';
    case 'uploading': return 'Uploading...';
    case 'processing': return 'Processing...';
    case 'complete': return 'Complete';
    case 'error': return 'Failed';
    case 'cancelled': return 'Cancelled';
  }
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function DocumentUploadPanel({
  context: initialContext = 'general',
  linkedDocumentId,
  linkedDocumentTitle,
  onUploadComplete,
  onFileComplete,
  onAllComplete,
  onClose,
  isModal = false,
  maxFiles = DEFAULT_MAX_FILES,
  maxFileSize = DEFAULT_MAX_FILE_SIZE,
  allowedTypes = DEFAULT_ALLOWED_TYPES,
}: DocumentUploadPanelProps) {
  // State
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [context, setContext] = useState<UploadContext>(initialContext);
  const [showContextDropdown, setShowContextDropdown] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [uploadAsNewVersion, setUploadAsNewVersion] = useState(!!linkedDocumentId);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  
  // Computed
  const stats = useMemo(() => {
    const total = files.length;
    const completed = files.filter(f => f.status === 'complete').length;
    const failed = files.filter(f => f.status === 'error').length;
    const pending = files.filter(f => ['queued', 'validating', 'uploading', 'processing'].includes(f.status)).length;
    const totalSize = files.reduce((acc, f) => acc + f.file.size, 0);
    const uploadedSize = files.reduce((acc, f) => {
      if (f.status === 'complete') return acc + f.file.size;
      if (f.status === 'uploading') return acc + (f.file.size * f.progress / 100);
      return acc;
    }, 0);
    const overallProgress = totalSize > 0 ? Math.round((uploadedSize / totalSize) * 100) : 0;
    
    return { total, completed, failed, pending, totalSize, uploadedSize, overallProgress };
  }, [files]);
  
  const hasQueuedFiles = files.some(f => f.status === 'queued');
  const hasActiveUploads = files.some(f => ['validating', 'uploading', 'processing'].includes(f.status));
  
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
  
  // Add files to queue
  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const fileArray = Array.from(newFiles);
    const remainingSlots = maxFiles - files.length;
    
    if (fileArray.length > remainingSlots) {
      // Only take what we can fit
      fileArray.splice(remainingSlots);
    }
    
    const uploadFiles: UploadFile[] = fileArray.map(file => {
      const validationErrors = validateFile(file);
      return {
        id: generateId(),
        file,
        status: validationErrors.length > 0 ? 'error' : 'queued',
        progress: 0,
        validationErrors: validationErrors.length > 0 ? validationErrors : undefined,
      };
    });
    
    setFiles(prev => [...prev, ...uploadFiles]);
  }, [files.length, maxFiles, validateFile]);
  
  // Remove file from queue
  const removeFile = useCallback((id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  }, []);
  
  // Clear all files
  const clearAll = useCallback(() => {
    setFiles([]);
  }, []);
  
  // Clear completed files
  const clearCompleted = useCallback(() => {
    setFiles(prev => prev.filter(f => f.status !== 'complete'));
  }, []);
  
  // Retry failed file
  const retryFile = useCallback((id: string) => {
    setFiles(prev => prev.map(f => 
      f.id === id ? { ...f, status: 'queued' as UploadFileStatus, progress: 0, error: undefined } : f
    ));
  }, []);
  
  // Upload a single file
  const uploadFile = useCallback(async (uploadFile: UploadFile): Promise<void> => {
    // Update status to validating
    setFiles(prev => prev.map(f => 
      f.id === uploadFile.id ? { ...f, status: 'validating' as UploadFileStatus, startedAt: new Date() } : f
    ));
    
    // Small delay for validation feel
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Update status to uploading
    setFiles(prev => prev.map(f => 
      f.id === uploadFile.id ? { ...f, status: 'uploading' as UploadFileStatus } : f
    ));
    
    try {
      const formData = new FormData();
      formData.append('file', uploadFile.file);
      formData.append('context', context);
      if (linkedDocumentId && uploadAsNewVersion) {
        formData.append('documentId', linkedDocumentId);
      }
      
      // Use XMLHttpRequest for progress tracking
      const result = await new Promise<UploadResult>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded / event.total) * 100);
            setFiles(prev => prev.map(f => 
              f.id === uploadFile.id ? { ...f, progress } : f
            ));
          }
        });
        
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const response = JSON.parse(xhr.responseText);
              if (response.data) {
                resolve(response.data);
              } else {
                reject(new Error(response.error || 'Upload failed'));
              }
            } catch {
              reject(new Error('Invalid response from server'));
            }
          } else {
            try {
              const errorResponse = JSON.parse(xhr.responseText);
              reject(new Error(errorResponse.error || `Upload failed with status ${xhr.status}`));
            } catch {
              reject(new Error(`Upload failed with status ${xhr.status}`));
            }
          }
        });
        
        xhr.addEventListener('error', () => {
          reject(new Error('Network error during upload'));
        });
        
        xhr.addEventListener('abort', () => {
          reject(new Error('Upload cancelled'));
        });
        
        xhr.open('POST', '/api/upload');
        xhr.send(formData);
      });
      
      // Update to processing
      setFiles(prev => prev.map(f => 
        f.id === uploadFile.id ? { ...f, status: 'processing' as UploadFileStatus, progress: 100 } : f
      ));
      
      // Small delay for processing feel
      await new Promise(resolve => setTimeout(resolve, 300));
      
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
  }, [context, linkedDocumentId, uploadAsNewVersion, onFileComplete]);
  
  // Start upload process
  const startUpload = useCallback(async () => {
    const queuedFiles = files.filter(f => f.status === 'queued');
    if (queuedFiles.length === 0) return;
    
    setIsUploading(true);
    setIsPaused(false);
    
    const results: UploadResult[] = [];
    
    for (const file of queuedFiles) {
      if (isPaused) break;
      await uploadFile(file);
      
      // Collect successful results
      const updatedFile = files.find(f => f.id === file.id);
      if (updatedFile?.result) {
        results.push(updatedFile.result);
      }
    }
    
    setIsUploading(false);
    
    if (results.length > 0) {
      onUploadComplete?.(results);
    }
    
    // Check if all done
    const allDone = files.every(f => ['complete', 'error', 'cancelled'].includes(f.status));
    if (allDone) {
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
    // Only set to false if we're leaving the dropzone entirely
    if (dropZoneRef.current && !dropZoneRef.current.contains(e.relatedTarget as Node)) {
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
    
    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles.length > 0) {
      addFiles(droppedFiles);
    }
  }, [addFiles]);
  
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(e.target.files);
      // Reset input so same file can be selected again
      e.target.value = '';
    }
  }, [addFiles]);
  
  const selectedContext = CONTEXT_OPTIONS.find(c => c.value === context)!;
  
  return (
    <div className={`flex flex-col ${isModal ? 'h-full' : 'h-auto'}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-accent-teal/20 rounded-lg">
            <Upload className="w-5 h-5 text-accent-teal" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-text-primary">Upload Documents</h2>
            <p className="text-xs text-text-muted">
              Drag & drop or click to select files
            </p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-2 hover:bg-surface-card rounded-lg transition-colors">
            <X className="w-5 h-5 text-text-muted" />
          </button>
        )}
      </div>
      
      {/* Context Selector & Options */}
      <div className="px-4 py-3 border-b border-border bg-surface/50 space-y-3">
        {/* Context Dropdown */}
        <div className="flex items-center gap-3">
          <span className="text-sm text-text-muted">Upload to:</span>
          <div className="relative">
            <button
              onClick={() => setShowContextDropdown(!showContextDropdown)}
              className="flex items-center gap-2 px-3 py-1.5 bg-surface-card border border-border rounded-lg hover:border-accent-teal/50 transition-colors"
            >
              {selectedContext.icon}
              <span className="text-sm font-medium text-text-primary">{selectedContext.label}</span>
              <ChevronDown className={`w-4 h-4 text-text-muted transition-transform ${showContextDropdown ? 'rotate-180' : ''}`} />
            </button>
            
            {showContextDropdown && (
              <div className="absolute top-full left-0 mt-1 w-64 bg-surface-elevated border border-border rounded-lg shadow-lg z-50">
                {CONTEXT_OPTIONS.map(option => (
                  <button
                    key={option.value}
                    onClick={() => {
                      setContext(option.value);
                      setShowContextDropdown(false);
                    }}
                    className={`w-full flex items-start gap-3 px-3 py-2 hover:bg-surface-card transition-colors first:rounded-t-lg last:rounded-b-lg ${context === option.value ? 'bg-accent-teal/10' : ''}`}
                  >
                    <span className={context === option.value ? 'text-accent-teal' : 'text-text-muted'}>
                      {option.icon}
                    </span>
                    <div className="text-left">
                      <div className={`text-sm font-medium ${context === option.value ? 'text-accent-teal' : 'text-text-primary'}`}>
                        {option.label}
                      </div>
                      <div className="text-xs text-text-muted">{option.description}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        
        {/* Linked Document Option */}
        {linkedDocumentId && (
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={uploadAsNewVersion}
                onChange={(e) => setUploadAsNewVersion(e.target.checked)}
                className="w-4 h-4 rounded border-border text-accent-teal focus:ring-accent-teal"
              />
              <span className="text-sm text-text-secondary flex items-center gap-1.5">
                <GitBranch className="w-4 h-4 text-accent-blue" />
                Upload as new version of 
                <span className="font-medium text-text-primary">&ldquo;{linkedDocumentTitle || linkedDocumentId}&rdquo;</span>
              </span>
            </label>
          </div>
        )}
      </div>
      
      {/* Dropzone */}
      <div className="p-4">
        <div
          ref={dropZoneRef}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`
            relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
            ${isDragging 
              ? 'border-accent-teal bg-accent-teal/10 scale-[1.02]' 
              : 'border-border hover:border-accent-teal/50 hover:bg-surface-card/50'
            }
          `}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileSelect}
            className="hidden"
            accept={allowedTypes.join(',')}
          />
          
          <div className={`transition-transform ${isDragging ? 'scale-110' : ''}`}>
            <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 ${isDragging ? 'bg-accent-teal/20' : 'bg-surface-card'}`}>
              <Upload className={`w-8 h-8 ${isDragging ? 'text-accent-teal' : 'text-text-muted'}`} />
            </div>
            <h3 className="text-lg font-medium text-text-primary mb-1">
              {isDragging ? 'Drop files here' : 'Drop files or click to upload'}
            </h3>
            <p className="text-sm text-text-muted mb-3">
              PDF, Word, Excel, XML, and images up to {formatFileSize(maxFileSize)}
            </p>
            <div className="flex items-center justify-center gap-2">
              <Badge color="slate" size="xs">Max {maxFiles} files</Badge>
              <Badge color="slate" size="xs">{formatFileSize(maxFileSize)} limit</Badge>
            </div>
          </div>
        </div>
      </div>
      
      {/* File Queue */}
      {files.length > 0 && (
        <div className="flex-1 flex flex-col min-h-0 border-t border-border">
          {/* Queue Header */}
          <div className="flex items-center justify-between px-4 py-2 bg-surface/50 border-b border-border">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-text-primary">
                {stats.total} file{stats.total !== 1 ? 's' : ''}
              </span>
              <span className="text-xs text-text-muted">
                {formatFileSize(stats.totalSize)}
              </span>
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
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {files.map(file => (
              <div 
                key={file.id}
                className={`
                  flex items-center gap-3 p-3 rounded-lg border transition-colors
                  ${file.status === 'complete' ? 'bg-status-success/5 border-status-success/20' : ''}
                  ${file.status === 'error' ? 'bg-status-error/5 border-status-error/20' : ''}
                  ${['queued', 'validating', 'uploading', 'processing'].includes(file.status) ? 'bg-surface-card border-border' : ''}
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
                      {file.file.name}
                    </span>
                    <span className="text-xs text-text-muted flex-shrink-0">
                      {formatFileSize(file.file.size)}
                    </span>
                  </div>
                  
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
                  
                  {/* Validation Errors */}
                  {file.validationErrors && file.validationErrors.length > 0 && (
                    <div className="mt-1 space-y-0.5">
                      {file.validationErrors.map((err, idx) => (
                        <p key={idx} className="text-xs text-status-error">{err}</p>
                      ))}
                    </div>
                  )}
                  
                  {/* Success Info */}
                  {file.status === 'complete' && file.result && (
                    <p className="text-xs text-status-success mt-1">
                      Uploaded to {file.result.storageProvider === 'r2' ? 'cloud storage' : 'server'}
                    </p>
                  )}
                </div>
                
                {/* Status & Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="flex items-center gap-1.5">
                    {getStatusIcon(file.status)}
                    <span className={`text-xs ${file.status === 'complete' ? 'text-status-success' : file.status === 'error' ? 'text-status-error' : 'text-text-muted'}`}>
                      {getStatusLabel(file.status)}
                    </span>
                  </div>
                  
                  {/* Actions */}
                  {file.status === 'error' && (
                    <button
                      onClick={() => retryFile(file.id)}
                      className="p-1 hover:bg-surface rounded transition-colors"
                      title="Retry"
                    >
                      <RefreshCw className="w-4 h-4 text-text-muted hover:text-text-secondary" />
                    </button>
                  )}
                  
                  {['queued', 'error', 'complete', 'cancelled'].includes(file.status) && (
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
            ))}
          </div>
        </div>
      )}
      
      {/* Footer Actions */}
      <div className="flex items-center justify-between p-4 border-t border-border bg-surface/50">
        <div className="flex items-center gap-2 text-xs text-text-muted">
          <Info className="w-4 h-4" />
          <span>Files are validated before upload</span>
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
              ? `Uploading ${stats.pending}...` 
              : hasQueuedFiles 
                ? `Upload ${files.filter(f => f.status === 'queued').length} File${files.filter(f => f.status === 'queued').length !== 1 ? 's' : ''}`
                : 'Select Files'
            }
          </Button>
        </div>
      </div>
    </div>
  );
}

export default DocumentUploadPanel;
