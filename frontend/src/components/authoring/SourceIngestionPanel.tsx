

import React, { useState, useCallback, useRef, useMemo } from 'react';
import {
  Upload,
  FileText,
  File,
  X,
  Check,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Eye,
  Trash2,
  Tag,
  Layers,
  Zap,
  Clock,
  Search,
  Filter,
  MoreVertical,
  Download,
  RefreshCw,
  Settings,
  CheckCircle,
  AlertCircle,
  Loader2,
  BookOpen,
  FlaskConical,
  Stethoscope,
  ClipboardList,
  BarChart3,
  FileBarChart,
  Beaker,
  Database,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { SearchInput } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { ProgressBar } from '@/components/ui/Progress';
import { CollapsibleSection } from '@/components/ui/CollapsibleSection';

// ============================================================================
// Types
// ============================================================================

export type SourceDocumentType = 
  | 'csr'           // Clinical Study Report
  | 'protocol'      // Study Protocol
  | 'sap'           // Statistical Analysis Plan
  | 'tfl'           // Tables, Figures, Listings
  | 'ib'            // Investigator's Brochure
  | 'cib'           // Clinical Investigator Brochure
  | 'summary'       // Clinical/Nonclinical Summary
  | 'reference'     // Reference Literature
  | 'regulatory'    // Regulatory Correspondence
  | 'other';

export type ExtractionStatus = 
  | 'pending'
  | 'extracting'
  | 'chunking'
  | 'complete'
  | 'error';

export interface SourceDocument {
  id: string;
  name: string;
  filename: string;
  type: SourceDocumentType;
  size: number;
  uploadedAt: Date;
  status: ExtractionStatus;
  progress?: number;
  error?: string;
  
  // Extraction results
  pageCount?: number;
  extractedText?: string;
  textLength?: number;
  chunks?: TextChunk[];
  
  // Metadata
  tags?: string[];
  studyId?: string;
  version?: string;
  effectiveDate?: string;
}

export interface TextChunk {
  id: string;
  index: number;
  text: string;
  tokenCount: number;
  pageStart: number;
  pageEnd: number;
  sectionTitle?: string;
  type: 'text' | 'table' | 'figure' | 'heading';
}

export interface SourceIngestionPanelProps {
  /** Currently uploaded sources */
  sources?: SourceDocument[];
  /** Callback when files are uploaded */
  onUpload?: (files: File[]) => Promise<void>;
  /** Callback when source type is changed */
  onTypeChange?: (sourceId: string, type: SourceDocumentType) => void;
  /** Callback when source is deleted */
  onDelete?: (sourceId: string) => void;
  /** Callback when chunks are previewed */
  onPreviewChunks?: (sourceId: string) => void;
  /** Callback when source is selected for AI context */
  onSelectForContext?: (sourceIds: string[]) => void;
  /** Maximum file size in bytes */
  maxFileSize?: number;
  /** Accepted file types */
  acceptedTypes?: string[];
  /** Whether panel is in loading state */
  loading?: boolean;
  /** Class name */
  className?: string;
}

// ============================================================================
// Constants
// ============================================================================

const SOURCE_TYPE_INFO: Record<SourceDocumentType, {
  label: string;
  icon: React.ReactNode;
  color: string;
  description: string;
}> = {
  csr: {
    label: 'Clinical Study Report',
    icon: <Stethoscope className="w-4 h-4" />,
    color: 'blue',
    description: 'Full CSR or CSR sections',
  },
  protocol: {
    label: 'Protocol',
    icon: <ClipboardList className="w-4 h-4" />,
    color: 'green',
    description: 'Study protocol document',
  },
  sap: {
    label: 'SAP',
    icon: <BarChart3 className="w-4 h-4" />,
    color: 'purple',
    description: 'Statistical Analysis Plan',
  },
  tfl: {
    label: 'TFLs',
    icon: <FileBarChart className="w-4 h-4" />,
    color: 'amber',
    description: 'Tables, Figures, Listings',
  },
  ib: {
    label: "Investigator's Brochure",
    icon: <BookOpen className="w-4 h-4" />,
    color: 'teal',
    description: 'IB or CIB document',
  },
  cib: {
    label: 'Clinical IB',
    icon: <BookOpen className="w-4 h-4" />,
    color: 'teal',
    description: 'Clinical Investigator Brochure',
  },
  summary: {
    label: 'Summary',
    icon: <FileText className="w-4 h-4" />,
    color: 'indigo',
    description: 'Clinical or nonclinical summary',
  },
  reference: {
    label: 'Reference',
    icon: <Database className="w-4 h-4" />,
    color: 'gray',
    description: 'Reference literature or data',
  },
  regulatory: {
    label: 'Regulatory',
    icon: <FlaskConical className="w-4 h-4" />,
    color: 'red',
    description: 'Regulatory correspondence',
  },
  other: {
    label: 'Other',
    icon: <File className="w-4 h-4" />,
    color: 'gray',
    description: 'Other source document',
  },
};

const DEFAULT_ACCEPTED_TYPES = ['.pdf', '.docx', '.doc', '.txt', '.xlsx', '.xls'];
const DEFAULT_MAX_SIZE = 50 * 1024 * 1024; // 50MB

// ============================================================================
// Helper Components
// ============================================================================

const StatusBadge: React.FC<{ status: ExtractionStatus; progress?: number }> = ({ status, progress }) => {
  const config: Record<ExtractionStatus, { color: string; icon: React.ReactNode; label: string }> = {
    pending: { color: 'gray', icon: <Clock className="w-3 h-3" />, label: 'Pending' },
    extracting: { color: 'blue', icon: <Loader2 className="w-3 h-3 animate-spin" />, label: 'Extracting' },
    chunking: { color: 'purple', icon: <Loader2 className="w-3 h-3 animate-spin" />, label: 'Chunking' },
    complete: { color: 'green', icon: <CheckCircle className="w-3 h-3" />, label: 'Ready' },
    error: { color: 'red', icon: <AlertCircle className="w-3 h-3" />, label: 'Error' },
  };
  
  const { color, icon, label } = config[status];
  
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium
      ${color === 'gray' ? 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300' : ''}
      ${color === 'blue' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : ''}
      ${color === 'purple' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' : ''}
      ${color === 'green' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : ''}
      ${color === 'red' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : ''}
    `}>
      {icon}
      {label}
      {progress !== undefined && status !== 'complete' && status !== 'error' && (
        <span className="ml-1">{progress}%</span>
      )}
    </span>
  );
};

const TypeSelector: React.FC<{
  value: SourceDocumentType;
  onChange: (type: SourceDocumentType) => void;
}> = ({ value, onChange }) => {
  const [open, setOpen] = useState(false);
  const info = SOURCE_TYPE_INFO[value];
  
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-2 py-1 rounded border border-gray-200 dark:border-gray-600 
          hover:bg-gray-50 dark:hover:bg-gray-700 text-sm"
      >
        {info.icon}
        <span className="text-gray-700 dark:text-gray-300">{info.label}</span>
        <ChevronDown className="w-3 h-3 text-gray-400" />
      </button>
      
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 mt-1 z-20 bg-white dark:bg-gray-800 rounded-lg shadow-lg 
            border border-gray-200 dark:border-gray-700 py-1 min-w-[200px]">
            {Object.entries(SOURCE_TYPE_INFO).map(([type, typeInfo]) => (
              <button
                key={type}
                onClick={() => {
                  onChange(type as SourceDocumentType);
                  setOpen(false);
                }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left
                  hover:bg-gray-50 dark:hover:bg-gray-700
                  ${type === value ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
              >
                {typeInfo.icon}
                <div>
                  <div className="text-gray-900 dark:text-white">{typeInfo.label}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{typeInfo.description}</div>
                </div>
                {type === value && <Check className="w-4 h-4 text-blue-500 ml-auto" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

// ============================================================================
// Main Component
// ============================================================================

export function SourceIngestionPanel({
  sources = [],
  onUpload,
  onTypeChange,
  onDelete,
  onPreviewChunks,
  onSelectForContext,
  maxFileSize = DEFAULT_MAX_SIZE,
  acceptedTypes = DEFAULT_ACCEPTED_TYPES,
  loading = false,
  className = '',
}: SourceIngestionPanelProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<SourceDocumentType | 'all'>('all');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Filter sources
  const filteredSources = useMemo(() => {
    return sources.filter(source => {
      if (searchQuery && !source.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      if (typeFilter !== 'all' && source.type !== typeFilter) {
        return false;
      }
      return true;
    });
  }, [sources, searchQuery, typeFilter]);
  
  // Group sources by type
  const groupedSources = useMemo(() => {
    const groups: Record<SourceDocumentType, SourceDocument[]> = {} as any;
    Object.keys(SOURCE_TYPE_INFO).forEach(type => {
      groups[type as SourceDocumentType] = [];
    });
    filteredSources.forEach(source => {
      groups[source.type].push(source);
    });
    return groups;
  }, [filteredSources]);
  
  // Stats
  const stats = useMemo(() => {
    const complete = sources.filter(s => s.status === 'complete').length;
    const processing = sources.filter(s => s.status === 'extracting' || s.status === 'chunking').length;
    const totalChunks = sources.reduce((sum, s) => sum + (s.chunks?.length || 0), 0);
    const totalTokens = sources.reduce((sum, s) => 
      sum + (s.chunks?.reduce((t, c) => t + c.tokenCount, 0) || 0), 0);
    return { total: sources.length, complete, processing, totalChunks, totalTokens };
  }, [sources]);
  
  // Handle drag events
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);
  
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);
  
  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    await handleFiles(files);
  }, []);
  
  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    await handleFiles(files);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);
  
  const handleFiles = async (files: File[]) => {
    setUploadError(null);
    
    // Validate files
    const validFiles: File[] = [];
    const errors: string[] = [];
    
    for (const file of files) {
      const ext = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!acceptedTypes.includes(ext)) {
        errors.push(`${file.name}: Unsupported file type`);
        continue;
      }
      if (file.size > maxFileSize) {
        errors.push(`${file.name}: File too large (max ${maxFileSize / 1024 / 1024}MB)`);
        continue;
      }
      validFiles.push(file);
    }
    
    if (errors.length > 0) {
      setUploadError(errors.join('\n'));
    }
    
    if (validFiles.length > 0 && onUpload) {
      setUploading(true);
      try {
        await onUpload(validFiles);
      } catch (err) {
        setUploadError(err instanceof Error ? err.message : 'Upload failed');
      } finally {
        setUploading(false);
      }
    }
  };
  
  // Selection
  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };
  
  const selectAll = () => {
    const readySources = sources.filter(s => s.status === 'complete');
    setSelectedIds(new Set(readySources.map(s => s.id)));
  };
  
  const clearSelection = () => {
    setSelectedIds(new Set());
  };
  
  // Format file size
  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };
  
  // Format token count
  const formatTokens = (tokens: number): string => {
    if (tokens < 1000) return `${tokens}`;
    return `${(tokens / 1000).toFixed(1)}K`;
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header with Stats */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Source Documents
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Upload and manage source documents for AI-assisted authoring
            </p>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="text-center">
              <div className="text-xl font-semibold text-gray-900 dark:text-white">{stats.total}</div>
              <div className="text-xs text-gray-500">Documents</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-semibold text-green-600 dark:text-green-400">{stats.complete}</div>
              <div className="text-xs text-gray-500">Ready</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-semibold text-purple-600 dark:text-purple-400">{stats.totalChunks}</div>
              <div className="text-xs text-gray-500">Chunks</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-semibold text-blue-600 dark:text-blue-400">{formatTokens(stats.totalTokens)}</div>
              <div className="text-xs text-gray-500">Tokens</div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {/* Drop Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`
              relative border-2 border-dashed rounded-lg p-8 text-center transition-colors
              ${isDragging 
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
              }
            `}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={acceptedTypes.join(',')}
              onChange={handleFileSelect}
              className="hidden"
            />
            
            <Upload className={`w-10 h-10 mx-auto mb-3 ${isDragging ? 'text-blue-500' : 'text-gray-400'}`} />
            
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
              {isDragging ? (
                'Drop files here...'
              ) : (
                <>
                  Drag and drop files here, or{' '}
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    browse
                  </button>
                </>
              )}
            </p>
            
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Supports: {acceptedTypes.join(', ')} • Max size: {maxFileSize / 1024 / 1024}MB
            </p>
            
            {uploading && (
              <div className="absolute inset-0 bg-white/80 dark:bg-gray-800/80 flex items-center justify-center rounded-lg">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                  <span className="text-sm text-gray-600 dark:text-gray-300">Uploading...</span>
                </div>
              </div>
            )}
          </div>
          
          {/* Upload Error */}
          {uploadError && (
            <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-700">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-red-700 dark:text-red-300 whitespace-pre-line">
                  {uploadError}
                </div>
                <button 
                  onClick={() => setUploadError(null)}
                  className="ml-auto text-red-500 hover:text-red-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Source List */}
      {sources.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-3">
              <SearchInput
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search sources..."
                className="w-64"
              />
              
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as any)}
                className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 
                  bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300"
              >
                <option value="all">All Types</option>
                {Object.entries(SOURCE_TYPE_INFO).map(([type, info]) => (
                  <option key={type} value={type}>{info.label}</option>
                ))}
              </select>
            </div>
            
            <div className="flex items-center gap-2">
              {selectedIds.size > 0 && (
                <>
                  <span className="text-sm text-gray-500">
                    {selectedIds.size} selected
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearSelection}
                  >
                    Clear
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => onSelectForContext?.(Array.from(selectedIds))}
                  >
                    <Zap className="w-4 h-4 mr-1" />
                    Use for AI Context
                  </Button>
                </>
              )}
              {selectedIds.size === 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={selectAll}
                >
                  Select All Ready
                </Button>
              )}
            </div>
          </CardHeader>
          
          <CardContent className="p-0">
            {/* Source Groups */}
            {Object.entries(groupedSources).map(([type, typeSources]) => {
              if (typeSources.length === 0) return null;
              const typeInfo = SOURCE_TYPE_INFO[type as SourceDocumentType];
              
              return (
                <CollapsibleSection
                  key={type}
                  title={typeInfo.label}
                  icon={typeInfo.icon}
                  count={typeSources.length}
                  defaultExpanded={true}
                  variant="minimal"
                  size="sm"
                >
                  <div className="space-y-2">
                    {typeSources.map(source => (
                      <div
                        key={source.id}
                        className={`
                          flex items-center gap-3 p-3 rounded-lg border transition-colors
                          ${selectedIds.has(source.id)
                            ? 'border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-900/20'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                          }
                        `}
                      >
                        {/* Checkbox */}
                        <button
                          onClick={() => toggleSelection(source.id)}
                          disabled={source.status !== 'complete'}
                          className={`
                            w-5 h-5 rounded border flex items-center justify-center flex-shrink-0
                            ${source.status !== 'complete' 
                              ? 'border-gray-200 bg-gray-100 cursor-not-allowed' 
                              : selectedIds.has(source.id)
                                ? 'border-blue-500 bg-blue-500'
                                : 'border-gray-300 hover:border-blue-400'
                            }
                          `}
                        >
                          {selectedIds.has(source.id) && <Check className="w-3 h-3 text-white" />}
                        </button>
                        
                        {/* File Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900 dark:text-white truncate">
                              {source.name}
                            </span>
                            <StatusBadge status={source.status} progress={source.progress} />
                          </div>
                          <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mt-1">
                            <span>{formatSize(source.size)}</span>
                            {source.pageCount && <span>{source.pageCount} pages</span>}
                            {source.chunks && (
                              <>
                                <span>{source.chunks.length} chunks</span>
                                <span>
                                  {formatTokens(source.chunks.reduce((t, c) => t + c.tokenCount, 0))} tokens
                                </span>
                              </>
                            )}
                          </div>
                          
                          {/* Progress bar for processing */}
                          {(source.status === 'extracting' || source.status === 'chunking') && (
                            <div className="mt-2">
                              <ProgressBar value={source.progress || 0} max={100} size="sm" />
                            </div>
                          )}
                          
                          {/* Error message */}
                          {source.error && (
                            <div className="mt-1 text-xs text-red-600 dark:text-red-400">
                              {source.error}
                            </div>
                          )}
                        </div>
                        
                        {/* Type Selector */}
                        <TypeSelector
                          value={source.type}
                          onChange={(newType) => onTypeChange?.(source.id, newType)}
                        />
                        
                        {/* Actions */}
                        <div className="flex items-center gap-1">
                          {source.status === 'complete' && source.chunks && (
                            <button
                              onClick={() => onPreviewChunks?.(source.id)}
                              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                              title="Preview chunks"
                            >
                              <Eye className="w-4 h-4 text-gray-500" />
                            </button>
                          )}
                          <button
                            onClick={() => onDelete?.(source.id)}
                            className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4 text-gray-500 hover:text-red-500" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CollapsibleSection>
              );
            })}
            
            {filteredSources.length === 0 && sources.length > 0 && (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                No sources match your filters
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default SourceIngestionPanel;
