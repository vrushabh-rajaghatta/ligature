

/**
 * FileUpload Component
 * 
 * Drag-and-drop or click-to-select file upload with progress indication,
 * file type validation, thumbnail previews, and file details. 
 * Integrates with /api/upload endpoint.
 * 
 * @version 0.13.9
 * @bite 1.2c - Basic FileUpload React component
 * @bite 1.2d - Drag-and-drop support
 * @bite 1.2e - File type validation UI
 * @bite 1.2f - Thumbnail generation for previews
 */

import { useState, useRef, useCallback, DragEvent } from 'react';
import { Upload, File, X, CheckCircle, AlertCircle, Loader2, FileText } from 'lucide-react';
import { Button } from './Button';
import { ProgressBar } from './ProgressBar';

// =============================================================================
// TYPES
// =============================================================================

export type UploadContext = 'tmf' | 'ectd' | 'safety' | 'authoring' | 'general';

export type UploadStatus = 'idle' | 'selected' | 'uploading' | 'success' | 'error';

export interface UploadedFile {
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

export interface FileUploadProps {
  /** Upload context for file organization */
  context?: UploadContext;
  /** Target path within context (e.g., "zone-01/artifacts") */
  targetPath?: string;
  /** Link to existing document record */
  documentId?: string;
  /** Callback when upload succeeds */
  onUploadComplete?: (file: UploadedFile) => void;
  /** Callback when upload fails */
  onUploadError?: (error: string) => void;
  /** Callback when file is selected (before upload) */
  onFileSelect?: (file: File) => void;
  /** Whether to auto-upload after selection */
  autoUpload?: boolean;
  /** Accepted file types (MIME types or extensions) */
  accept?: string;
  /** Maximum file size in bytes (default: 50MB) */
  maxSize?: number;
  /** Custom label text */
  label?: string;
  /** Helper text below the upload area */
  helperText?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Compact mode for inline usage */
  compact?: boolean;
  /** Show file list after upload */
  showFileList?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// =============================================================================
// HELPERS
// =============================================================================

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function getFileIcon(mimeType: string): string {
  if (mimeType === 'application/pdf') return '📄';
  if (mimeType.includes('word') || mimeType.includes('document')) return '📝';
  if (mimeType.includes('sheet') || mimeType.includes('excel')) return '📊';
  if (mimeType.startsWith('image/')) return '🖼️';
  if (mimeType.includes('xml')) return '📋';
  if (mimeType.includes('zip')) return '📦';
  return '📎';
}

/**
 * Validate file type against accept string
 * Supports: MIME types (image/png), wildcards (image/*), extensions (.pdf)
 */
function isFileTypeValid(file: File, accept: string | undefined): boolean {
  if (!accept) return true; // No restrictions
  
  const acceptedTypes = accept.split(',').map(t => t.trim().toLowerCase());
  const fileName = file.name.toLowerCase();
  const mimeType = file.type.toLowerCase();
  
  return acceptedTypes.some(accepted => {
    // Extension match (.pdf, .docx)
    if (accepted.startsWith('.')) {
      return fileName.endsWith(accepted);
    }
    // Wildcard MIME type (image/*, application/*)
    if (accepted.endsWith('/*')) {
      const category = accepted.slice(0, -2);
      return mimeType.startsWith(category + '/');
    }
    // Exact MIME type match
    return mimeType === accepted;
  });
}

/**
 * Get human-readable description of accepted file types
 */
function getAcceptedTypesDescription(accept: string | undefined): string {
  if (!accept) return 'all files';
  
  const types = accept.split(',').map(t => t.trim());
  const descriptions: string[] = [];
  
  for (const type of types) {
    if (type.startsWith('.')) {
      descriptions.push(type.toUpperCase().slice(1));
    } else if (type === 'application/pdf') {
      descriptions.push('PDF');
    } else if (type === 'image/*') {
      descriptions.push('images');
    } else if (type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      descriptions.push('Word documents');
    } else if (type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
      descriptions.push('Excel files');
    } else if (type === 'text/xml' || type === 'application/xml') {
      descriptions.push('XML');
    } else if (type.startsWith('image/')) {
      descriptions.push(type.split('/')[1].toUpperCase());
    } else {
      descriptions.push(type);
    }
  }
  
  if (descriptions.length === 1) return descriptions[0];
  if (descriptions.length === 2) return descriptions.join(' or ');
  return descriptions.slice(0, -1).join(', ') + ', or ' + descriptions.slice(-1);
}

// =============================================================================
// COMPONENT
// =============================================================================

export function FileUpload({
  context = 'general',
  targetPath,
  documentId,
  onUploadComplete,
  onUploadError,
  onFileSelect,
  autoUpload = true,
  accept,
  maxSize = 50 * 1024 * 1024, // 50MB default
  label = 'Upload File',
  helperText,
  disabled = false,
  compact = false,
  showFileList = true,
  className = '',
}: FileUploadProps) {
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0); // Track nested drag events

  // Generate thumbnail for image files
  const generateThumbnail = useCallback((file: File) => {
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setThumbnail(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else if (file.type === 'application/pdf') {
      // For PDFs, we'll show a styled indicator (actual preview would need server-side)
      setThumbnail('pdf');
    } else {
      setThumbnail(null);
    }
  }, []);

  // Handle file selection
  const handleFileSelect = useCallback((file: File) => {
    // Validate file type
    if (!isFileTypeValid(file, accept)) {
      const acceptedDesc = getAcceptedTypesDescription(accept);
      const errorMsg = `Invalid file type. Please upload ${acceptedDesc}`;
      setError(errorMsg);
      setStatus('error');
      onUploadError?.(errorMsg);
      return;
    }

    // Validate file size
    if (file.size > maxSize) {
      const errorMsg = `File too large. Maximum size is ${formatFileSize(maxSize)}`;
      setError(errorMsg);
      setStatus('error');
      onUploadError?.(errorMsg);
      return;
    }

    setSelectedFile(file);
    setError(null);
    setStatus('selected');
    generateThumbnail(file);
    onFileSelect?.(file);

    if (autoUpload) {
      uploadFile(file);
    }
  }, [accept, maxSize, autoUpload, onFileSelect, onUploadError]);

  // Handle input change
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
    // Reset input so same file can be selected again
    e.target.value = '';
  }, [handleFileSelect]);

  // Drag & drop handlers
  const handleDragEnter = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    
    // Only set dragging false when we've left all nested elements
    if (dragCounterRef.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsDragging(false);
    dragCounterRef.current = 0;
    
    if (disabled) return;
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      // Only take the first file (single file upload)
      handleFileSelect(files[0]);
    }
  }, [disabled, handleFileSelect]);

  // Trigger file picker
  const openFilePicker = useCallback(() => {
    if (!disabled) {
      inputRef.current?.click();
    }
  }, [disabled]);

  // Upload file to API
  const uploadFile = useCallback(async (file: File) => {
    setStatus('uploading');
    setProgress(0);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('context', context);
    if (targetPath) formData.append('targetPath', targetPath);
    if (documentId) formData.append('documentId', documentId);

    try {
      // Simulate progress for UX (real progress would need XHR)
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 100);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const result = await response.json();
      
      setProgress(100);
      setUploadedFile(result.data);
      setStatus('success');
      onUploadComplete?.(result.data);

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Upload failed';
      setError(errorMsg);
      setStatus('error');
      setProgress(0);
      onUploadError?.(errorMsg);
    }
  }, [context, targetPath, documentId, onUploadComplete, onUploadError]);

  // Manual upload trigger (when autoUpload is false)
  const handleManualUpload = useCallback(() => {
    if (selectedFile && status === 'selected') {
      uploadFile(selectedFile);
    }
  }, [selectedFile, status, uploadFile]);

  // Reset to initial state
  const handleReset = useCallback(() => {
    setStatus('idle');
    setSelectedFile(null);
    setUploadedFile(null);
    setProgress(0);
    setError(null);
    setThumbnail(null);
  }, []);

  // ==========================================================================
  // RENDER
  // ==========================================================================

  // Compact mode (button only)
  if (compact) {
    return (
      <div className={className}>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleInputChange}
          className="hidden"
          disabled={disabled}
        />
        <Button
          variant="outline"
          onClick={openFilePicker}
          disabled={disabled || status === 'uploading'}
          loading={status === 'uploading'}
          icon={<Upload className="w-4 h-4" />}
        >
          {status === 'uploading' ? 'Uploading...' : label}
        </Button>
        {status === 'success' && uploadedFile && (
          <span className="ml-2 text-sm text-accent-green flex items-center gap-1">
            <CheckCircle className="w-4 h-4" />
            {uploadedFile.fileName}
          </span>
        )}
        {status === 'error' && error && (
          <span className="ml-2 text-sm text-accent-red flex items-center gap-1">
            <AlertCircle className="w-4 h-4" />
            {error}
          </span>
        )}
      </div>
    );
  }

  // Full upload zone
  return (
    <div className={`space-y-3 ${className}`}>
      {/* Hidden input */}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleInputChange}
        className="hidden"
        disabled={disabled}
      />

      {/* Upload Zone */}
      <div
        onClick={openFilePicker}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-lg p-6
          flex flex-col items-center justify-center gap-3
          transition-all duration-150 cursor-pointer
          ${disabled 
            ? 'border-border bg-surface-card opacity-50 cursor-not-allowed' 
            : isDragging
            ? 'border-accent-blue bg-accent-blue/10 scale-[1.02] shadow-lg'
            : status === 'error'
            ? 'border-accent-red/50 bg-accent-red/5 hover:border-accent-red hover:bg-accent-red/10'
            : status === 'success'
            ? 'border-accent-green/50 bg-accent-green/5'
            : 'border-border bg-surface-card hover:border-accent-blue hover:bg-surface-hover'
          }
        `}
      >
        {/* Drag overlay */}
        {isDragging && (
          <div className="absolute inset-0 flex items-center justify-center bg-accent-blue/5 rounded-lg pointer-events-none z-10">
            <div className="text-center">
              <Upload className="w-8 h-8 text-accent-blue mx-auto mb-2 animate-bounce" />
              <p className="text-sm font-medium text-accent-blue">Drop file here</p>
            </div>
          </div>
        )}
        {/* Icon */}
        <div className={`
          w-12 h-12 rounded-full flex items-center justify-center
          ${status === 'error' ? 'bg-accent-red/10 text-accent-red' :
            status === 'success' ? 'bg-accent-green/10 text-accent-green' :
            status === 'uploading' ? 'bg-accent-blue/10 text-accent-blue' :
            'bg-surface-elevated text-text-muted'}
        `}>
          {status === 'uploading' ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : status === 'success' ? (
            <CheckCircle className="w-6 h-6" />
          ) : status === 'error' ? (
            <AlertCircle className="w-6 h-6" />
          ) : (
            <Upload className="w-6 h-6" />
          )}
        </div>

        {/* Text */}
        <div className={`text-center ${isDragging ? 'opacity-0' : 'opacity-100'} transition-opacity`}>
          {status === 'idle' && (
            <>
              <p className="text-sm font-medium text-text-primary">{label}</p>
              <p className="text-xs text-text-muted mt-1">
                Drag and drop or click to select
              </p>
              {accept && (
                <p className="text-xs text-text-muted mt-1">
                  Accepts: {getAcceptedTypesDescription(accept)}
                </p>
              )}
            </>
          )}
          {status === 'selected' && selectedFile && (
            <div className="flex flex-col items-center gap-2">
              {/* Thumbnail preview */}
              {thumbnail && thumbnail !== 'pdf' && (
                <div className="w-20 h-20 rounded-lg overflow-hidden border border-border shadow-sm">
                  <img 
                    src={thumbnail} 
                    alt="Preview" 
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              {thumbnail === 'pdf' && (
                <div className="w-20 h-20 rounded-lg bg-accent-red/10 border border-accent-red/20 flex items-center justify-center">
                  <FileText className="w-8 h-8 text-accent-red" />
                </div>
              )}
              {!thumbnail && (
                <div className="w-12 h-12 rounded-lg bg-surface-elevated flex items-center justify-center text-2xl">
                  {getFileIcon(selectedFile.type)}
                </div>
              )}
              <div className="text-center">
                <p className="text-sm font-medium text-text-primary truncate max-w-[200px]">
                  {selectedFile.name}
                </p>
                <p className="text-xs text-text-muted mt-0.5">
                  {formatFileSize(selectedFile.size)}
                </p>
              </div>
            </div>
          )}
          {status === 'uploading' && (
            <>
              <p className="text-sm font-medium text-accent-blue">Uploading...</p>
              <div className="w-48 mt-2">
                <ProgressBar value={progress} size="sm" color="bg-accent-blue" />
              </div>
            </>
          )}
          {status === 'success' && uploadedFile && (
            <>
              <p className="text-sm font-medium text-accent-green">Upload Complete</p>
              <p className="text-xs text-text-muted mt-1">
                {uploadedFile.fileName}
              </p>
            </>
          )}
          {status === 'error' && (
            <>
              <p className="text-sm font-medium text-accent-red">Upload Failed</p>
              <p className="text-xs text-accent-red/80 mt-1">{error}</p>
            </>
          )}
        </div>

        {/* Helper text */}
        {status === 'idle' && helperText && (
          <p className="text-xs text-text-muted">{helperText}</p>
        )}
      </div>

      {/* Action buttons */}
      {(status === 'selected' && !autoUpload) && (
        <div className="flex items-center gap-2">
          <Button variant="primary" onClick={handleManualUpload}>
            Upload
          </Button>
          <Button variant="ghost" onClick={handleReset}>
            Cancel
          </Button>
        </div>
      )}

      {(status === 'success' || status === 'error') && (
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleReset}>
            {status === 'success' ? 'Upload Another' : 'Try Again'}
          </Button>
        </div>
      )}

      {/* File details (success state) */}
      {status === 'success' && uploadedFile && showFileList && (
        <div className="bg-surface-card border border-border rounded-lg p-3">
          <div className="flex items-start gap-3">
            {/* Thumbnail or icon */}
            {thumbnail && thumbnail !== 'pdf' ? (
              <div className="w-12 h-12 rounded-lg overflow-hidden border border-border flex-shrink-0">
                <img src={thumbnail} alt="Preview" className="w-full h-full object-cover" />
              </div>
            ) : thumbnail === 'pdf' ? (
              <div className="w-12 h-12 rounded-lg bg-accent-red/10 border border-accent-red/20 flex items-center justify-center flex-shrink-0">
                <FileText className="w-6 h-6 text-accent-red" />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-lg bg-surface-elevated flex items-center justify-center text-lg flex-shrink-0">
                {getFileIcon(uploadedFile.mimeType)}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-text-primary truncate">
                {uploadedFile.fileName}
              </p>
              <div className="flex items-center gap-3 text-xs text-text-muted mt-1">
                <span>{formatFileSize(uploadedFile.fileSize)}</span>
                <span>•</span>
                <span>{uploadedFile.mimeType}</span>
                {uploadedFile.storageProvider === 'r2' && (
                  <>
                    <span>•</span>
                    <span className="text-accent-green">☁️ Cloud</span>
                  </>
                )}
              </div>
              <p className="text-xs text-text-muted mt-1 font-mono truncate">
                ID: {uploadedFile.fileId}
              </p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleReset();
              }}
              className="p-1 hover:bg-surface-hover rounded"
            >
              <X className="w-4 h-4 text-text-muted" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// EXPORTS
// =============================================================================

export default FileUpload;
