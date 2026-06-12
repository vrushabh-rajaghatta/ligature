

/**
 * VersionCreationWizard - Multi-step wizard for creating document versions
 * 
 * Features:
 * - Version type selection (major/minor/patch/editorial)
 * - Change description with rich text support
 * - Optional file replacement upload
 * - Changed sections tracking
 * - Review and confirmation step
 * - Integration with Document Control store
 * 
 * @version 0.13.43
 */

import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  GitBranch, ChevronRight, ChevronLeft, Check, X, Upload,
  FileText, AlertCircle, Info, Sparkles, Clock, Shield,
  ArrowRight, CheckCircle, File, Trash2, Plus, History,
  AlertTriangle, FileCheck, BookOpen, Edit3, Zap
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import type { EnterpriseDocument, DocumentVersion } from '@/domains/document-control/contracts';
import type { UploadResult } from '@/components/documents/DocumentUploadPanel';

// =============================================================================
// TYPES
// =============================================================================

export type VersionType = 'major' | 'minor' | 'patch' | 'editorial';

export interface VersionCreationData {
  versionType: VersionType;
  changeDescription: string;
  changedSections: string[];
  replaceFile: boolean;
  newFile?: File;
  uploadResult?: UploadResult;
  createBaseline: boolean;
  baselineLabel?: string;
}

export interface VersionCreationWizardProps {
  /** Document to create version for */
  document: EnterpriseDocument;
  /** Callback when version is created */
  onVersionCreate: (data: VersionCreationData) => void;
  /** Callback to close wizard */
  onClose: () => void;
  /** Optional: existing sections to select from */
  documentSections?: string[];
}

type WizardStep = 'type' | 'description' | 'file' | 'review';

// =============================================================================
// CONSTANTS
// =============================================================================

const VERSION_TYPES: Array<{
  type: VersionType;
  label: string;
  description: string;
  example: string;
  icon: React.ReactNode;
  color: string;
}> = [
  {
    type: 'major',
    label: 'Major Version',
    description: 'Significant changes that affect document meaning, regulatory impact, or require re-approval',
    example: '1.0.0 → 2.0.0',
    icon: <Zap className="w-5 h-5" />,
    color: 'text-status-error bg-status-error/10 border-status-error/30',
  },
  {
    type: 'minor',
    label: 'Minor Version',
    description: 'Moderate changes such as new sections, updated data, or clarifications',
    example: '1.0.0 → 1.1.0',
    icon: <Edit3 className="w-5 h-5" />,
    color: 'text-status-warning bg-status-warning/10 border-status-warning/30',
  },
  {
    type: 'patch',
    label: 'Patch Version',
    description: 'Minor corrections, formatting fixes, or non-substantive updates',
    example: '1.0.0 → 1.0.1',
    icon: <FileCheck className="w-5 h-5" />,
    color: 'text-accent-blue bg-accent-blue/10 border-accent-blue/30',
  },
  {
    type: 'editorial',
    label: 'Editorial',
    description: 'Typo fixes, style corrections, or metadata updates only',
    example: '1.0.0 → 1.0.0-e1',
    icon: <BookOpen className="w-5 h-5" />,
    color: 'text-text-muted bg-surface border-border',
  },
];

const COMMON_SECTIONS = [
  'Title Page',
  'Table of Contents',
  'Introduction',
  'Background',
  'Objectives',
  'Methods',
  'Results',
  'Discussion',
  'Conclusions',
  'References',
  'Appendices',
  'Abbreviations',
  'Signatures',
];

const WIZARD_STEPS: Array<{ id: WizardStep; label: string; description: string }> = [
  { id: 'type', label: 'Version Type', description: 'Select the type of version change' },
  { id: 'description', label: 'Description', description: 'Describe what changed' },
  { id: 'file', label: 'File Upload', description: 'Optionally replace the document file' },
  { id: 'review', label: 'Review', description: 'Review and create version' },
];

// =============================================================================
// HELPERS
// =============================================================================

function calculateNewVersion(
  current: { major: number; minor: number; patch: number },
  type: VersionType
): string {
  switch (type) {
    case 'major':
      return `${current.major + 1}.0.0`;
    case 'minor':
      return `${current.major}.${current.minor + 1}.0`;
    case 'patch':
      return `${current.major}.${current.minor}.${current.patch + 1}`;
    case 'editorial':
      return `${current.major}.${current.minor}.${current.patch}-e1`;
  }
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function VersionCreationWizard({
  document,
  onVersionCreate,
  onClose,
  documentSections = COMMON_SECTIONS,
}: VersionCreationWizardProps) {
  // State
  const [currentStep, setCurrentStep] = useState<WizardStep>('type');
  const [versionType, setVersionType] = useState<VersionType | null>(null);
  const [changeDescription, setChangeDescription] = useState('');
  const [changedSections, setChangedSections] = useState<string[]>([]);
  const [customSection, setCustomSection] = useState('');
  const [replaceFile, setReplaceFile] = useState(false);
  const [newFile, setNewFile] = useState<File | null>(null);
  const [createBaseline, setCreateBaseline] = useState(false);
  const [baselineLabel, setBaselineLabel] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Computed
  const currentStepIndex = WIZARD_STEPS.findIndex(s => s.id === currentStep);
  
  const newVersion = useMemo(() => {
    if (!versionType) return null;
    return calculateNewVersion({
      major: document.majorVersion,
      minor: document.minorVersion,
      patch: document.patchVersion,
    }, versionType);
  }, [versionType, document]);
  
  const canProceed = useMemo(() => {
    switch (currentStep) {
      case 'type':
        return versionType !== null;
      case 'description':
        return changeDescription.trim().length >= 10;
      case 'file':
        return true; // File is optional
      case 'review':
        return true;
      default:
        return false;
    }
  }, [currentStep, versionType, changeDescription]);
  
  // Handlers
  const handleNext = useCallback(() => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < WIZARD_STEPS.length) {
      setCurrentStep(WIZARD_STEPS[nextIndex].id);
    }
  }, [currentStepIndex]);
  
  const handleBack = useCallback(() => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(WIZARD_STEPS[prevIndex].id);
    }
  }, [currentStepIndex]);
  
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNewFile(file);
      setReplaceFile(true);
    }
  }, []);
  
  const handleRemoveFile = useCallback(() => {
    setNewFile(null);
    setReplaceFile(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);
  
  const handleToggleSection = useCallback((section: string) => {
    setChangedSections(prev => 
      prev.includes(section) 
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  }, []);
  
  const handleAddCustomSection = useCallback(() => {
    if (customSection.trim() && !changedSections.includes(customSection.trim())) {
      setChangedSections(prev => [...prev, customSection.trim()]);
      setCustomSection('');
    }
  }, [customSection, changedSections]);
  
  const handleCreate = useCallback(async () => {
    if (!versionType) return;
    
    setIsCreating(true);
    
    try {
      const data: VersionCreationData = {
        versionType,
        changeDescription,
        changedSections,
        replaceFile,
        newFile: newFile || undefined,
        createBaseline,
        baselineLabel: createBaseline ? baselineLabel : undefined,
      };
      
      onVersionCreate(data);
    } finally {
      setIsCreating(false);
    }
  }, [versionType, changeDescription, changedSections, replaceFile, newFile, createBaseline, baselineLabel, onVersionCreate]);
  
  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 'type':
        return (
          <div className="space-y-4">
            <div className="text-sm text-text-muted mb-4">
              Select the type of version change based on the significance of your updates.
            </div>
            
            <div className="grid gap-3">
              {VERSION_TYPES.map(({ type, label, description, example, icon, color }) => (
                <button
                  key={type}
                  onClick={() => setVersionType(type)}
                  className={`
                    flex items-start gap-4 p-4 rounded-lg border-2 text-left transition-all
                    ${versionType === type 
                      ? `${color} ring-2 ring-offset-2 ring-offset-surface-elevated` 
                      : 'border-border bg-surface-card hover:border-border-hover'
                    }
                  `}
                >
                  <div className={`
                    p-2 rounded-lg flex-shrink-0
                    ${versionType === type ? '' : 'bg-surface'}
                  `}>
                    <span className={versionType === type ? '' : 'text-text-muted'}>
                      {icon}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-text-primary">{label}</span>
                      <span className="text-xs font-mono text-text-muted">{example}</span>
                    </div>
                    <p className="text-sm text-text-secondary">{description}</p>
                  </div>
                  {versionType === type && (
                    <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  )}
                </button>
              ))}
            </div>
            
            {versionType && (
              <div className="mt-4 p-3 bg-accent-blue/5 border border-accent-blue/20 rounded-lg">
                <div className="flex items-center gap-2 text-sm">
                  <Info className="w-4 h-4 text-accent-blue" />
                  <span className="text-text-primary">
                    New version will be: <span className="font-mono font-medium text-accent-blue">v{newVersion}</span>
                  </span>
                </div>
              </div>
            )}
          </div>
        );
        
      case 'description':
        return (
          <div className="space-y-6">
            {/* Change Description */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Change Description <span className="text-status-error">*</span>
              </label>
              <textarea
                value={changeDescription}
                onChange={(e) => setChangeDescription(e.target.value)}
                placeholder="Describe the changes made in this version..."
                rows={4}
                className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:border-accent-blue focus:ring-1 focus:ring-accent-blue resize-none"
              />
              <div className="flex items-center justify-between mt-1">
                <span className={`text-xs ${changeDescription.length < 10 ? 'text-status-warning' : 'text-text-muted'}`}>
                  Minimum 10 characters required
                </span>
                <span className="text-xs text-text-muted">{changeDescription.length} characters</span>
              </div>
            </div>
            
            {/* Changed Sections */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Changed Sections <span className="text-text-muted font-normal">(optional)</span>
              </label>
              <p className="text-xs text-text-muted mb-3">
                Select or add the sections that were modified in this version.
              </p>
              
              <div className="flex flex-wrap gap-2 mb-3">
                {documentSections.map(section => (
                  <button
                    key={section}
                    onClick={() => handleToggleSection(section)}
                    className={`
                      px-3 py-1.5 text-xs rounded-full border transition-colors
                      ${changedSections.includes(section)
                        ? 'bg-accent-blue text-white border-accent-blue'
                        : 'bg-surface border-border text-text-secondary hover:border-accent-blue/50'
                      }
                    `}
                  >
                    {section}
                  </button>
                ))}
              </div>
              
              {/* Custom section input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customSection}
                  onChange={(e) => setCustomSection(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddCustomSection()}
                  placeholder="Add custom section..."
                  className="flex-1 px-3 py-1.5 bg-surface border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:border-accent-blue focus:ring-1 focus:ring-accent-blue"
                />
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<Plus className="w-4 h-4" />}
                  onClick={handleAddCustomSection}
                  disabled={!customSection.trim()}
                >
                  Add
                </Button>
              </div>
              
              {changedSections.length > 0 && (
                <div className="mt-3 text-xs text-text-muted">
                  {changedSections.length} section{changedSections.length !== 1 ? 's' : ''} selected
                </div>
              )}
            </div>
          </div>
        );
        
      case 'file':
        return (
          <div className="space-y-6">
            <div className="text-sm text-text-muted">
              Optionally upload a new file to replace the current document content.
            </div>
            
            {/* Current File Info */}
            <div className="p-4 bg-surface rounded-lg border border-border">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-surface-card rounded-lg">
                  <FileText className="w-5 h-5 text-accent-blue" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary">Current File</p>
                  <p className="text-xs text-text-muted truncate">{document.filePath}</p>
                </div>
                <div className="text-xs text-text-muted">
                  {formatFileSize(document.fileSize)}
                </div>
              </div>
            </div>
            
            {/* File Upload Option */}
            <div 
              className={`
                border-2 border-dashed rounded-lg p-6 text-center transition-colors
                ${newFile 
                  ? 'border-status-success bg-status-success/5' 
                  : 'border-border hover:border-accent-blue/50'
                }
              `}
            >
              {newFile ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-center gap-3">
                    <div className="p-2 bg-status-success/10 rounded-lg">
                      <File className="w-6 h-6 text-status-success" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-medium text-text-primary">{newFile.name}</p>
                      <p className="text-xs text-text-muted">{formatFileSize(newFile.size)}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={<Trash2 className="w-4 h-4" />}
                      onClick={handleRemoveFile}
                    >
                      Remove
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<Upload className="w-4 h-4" />}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Replace
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <Upload className="w-10 h-10 text-text-muted mx-auto mb-3" />
                  <p className="text-sm text-text-primary mb-1">
                    Drop a file here or click to select
                  </p>
                  <p className="text-xs text-text-muted mb-3">
                    PDF, Word, Excel, or XML files up to 50MB
                  </p>
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<Upload className="w-4 h-4" />}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Select File
                  </Button>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileSelect}
                accept=".pdf,.doc,.docx,.xlsx,.xls,.xml"
                className="hidden"
              />
            </div>
            
            {!newFile && (
              <div className="flex items-start gap-2 p-3 bg-surface rounded-lg border border-border">
                <Info className="w-4 h-4 text-text-muted flex-shrink-0 mt-0.5" />
                <p className="text-xs text-text-muted">
                  If you don't upload a new file, the version will be created with a reference to the existing file. 
                  The change description and metadata will still be recorded.
                </p>
              </div>
            )}
          </div>
        );
        
      case 'review':
        return (
          <div className="space-y-6">
            {/* Version Summary */}
            <div className="p-4 bg-accent-blue/5 border border-accent-blue/20 rounded-lg">
              <div className="flex items-center gap-3 mb-3">
                <GitBranch className="w-5 h-5 text-accent-blue" />
                <div>
                  <p className="text-sm text-text-muted">Creating version</p>
                  <p className="text-xl font-mono font-semibold text-accent-blue">
                    v{document.version} → v{newVersion}
                  </p>
                </div>
              </div>
              <Badge 
                color={
                  versionType === 'major' ? 'red' : 
                  versionType === 'minor' ? 'amber' : 
                  versionType === 'patch' ? 'blue' : 
                  'slate'
                }
              >
                {VERSION_TYPES.find(t => t.type === versionType)?.label}
              </Badge>
            </div>
            
            {/* Review Details */}
            <div className="space-y-4">
              <ReviewItem 
                label="Document" 
                value={document.title}
                subValue={document.documentId}
              />
              
              <ReviewItem 
                label="Change Description" 
                value={changeDescription}
              />
              
              {changedSections.length > 0 && (
                <ReviewItem 
                  label="Changed Sections" 
                  value={changedSections.join(', ')}
                />
              )}
              
              <ReviewItem 
                label="File Update" 
                value={newFile ? `Replacing with: ${newFile.name}` : 'No file change'}
                variant={newFile ? 'success' : 'muted'}
              />
            </div>
            
            {/* Baseline Option */}
            <div className="p-4 bg-surface rounded-lg border border-border">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={createBaseline}
                  onChange={(e) => setCreateBaseline(e.target.checked)}
                  className="mt-1 rounded border-border"
                />
                <div>
                  <p className="text-sm font-medium text-text-primary">Create as baseline</p>
                  <p className="text-xs text-text-muted">
                    Mark this version as a baseline for regulatory submissions or audits
                  </p>
                </div>
              </label>
              
              {createBaseline && (
                <div className="mt-3 ml-7">
                  <input
                    type="text"
                    value={baselineLabel}
                    onChange={(e) => setBaselineLabel(e.target.value)}
                    placeholder="Baseline label (e.g., IND Submission, Audit Freeze)"
                    className="w-full px-3 py-1.5 bg-surface-card border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:border-accent-blue focus:ring-1 focus:ring-accent-blue"
                  />
                </div>
              )}
            </div>
            
            {/* Warning for major versions */}
            {versionType === 'major' && (
              <div className="flex items-start gap-3 p-3 bg-status-warning/10 border border-status-warning/30 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-status-warning flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-text-primary">Major Version Warning</p>
                  <p className="text-xs text-text-muted mt-1">
                    Major versions may require re-approval and could impact regulatory submissions. 
                    Make sure all stakeholders have been notified of significant changes.
                  </p>
                </div>
              </div>
            )}
          </div>
        );
        
      default:
        return null;
    }
  };
  
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-accent-teal/20 rounded-lg">
            <GitBranch className="w-5 h-5 text-accent-teal" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-text-primary">Create New Version</h2>
            <p className="text-xs text-text-muted">{document.title}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-surface rounded-lg transition-colors"
        >
          <X className="w-5 h-5 text-text-muted" />
        </button>
      </div>
      
      {/* Progress Steps */}
      <div className="px-4 py-3 border-b border-border bg-surface/50">
        <div className="flex items-center justify-between">
          {WIZARD_STEPS.map((step, index) => (
            <React.Fragment key={step.id}>
              <button
                onClick={() => index <= currentStepIndex && setCurrentStep(step.id)}
                disabled={index > currentStepIndex}
                className={`
                  flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors
                  ${currentStep === step.id 
                    ? 'bg-accent-blue/10 text-accent-blue' 
                    : index < currentStepIndex
                      ? 'text-status-success hover:bg-surface'
                      : 'text-text-muted cursor-not-allowed'
                  }
                `}
              >
                <div className={`
                  w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium
                  ${currentStep === step.id 
                    ? 'bg-accent-blue text-white' 
                    : index < currentStepIndex
                      ? 'bg-status-success text-white'
                      : 'bg-surface border border-border text-text-muted'
                  }
                `}>
                  {index < currentStepIndex ? <Check className="w-3.5 h-3.5" /> : index + 1}
                </div>
                <span className="text-sm font-medium hidden sm:inline">{step.label}</span>
              </button>
              {index < WIZARD_STEPS.length - 1 && (
                <ChevronRight className="w-4 h-4 text-text-muted hidden sm:block" />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {renderStepContent()}
      </div>
      
      {/* Footer */}
      <div className="flex items-center justify-between p-4 border-t border-border bg-surface/50">
        <div>
          {currentStepIndex > 0 && (
            <Button
              variant="ghost"
              icon={<ChevronLeft className="w-4 h-4" />}
              onClick={handleBack}
            >
              Back
            </Button>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          
          {currentStep === 'review' ? (
            <Button
              variant="primary"
              icon={isCreating ? <Clock className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              onClick={handleCreate}
              disabled={isCreating}
            >
              {isCreating ? 'Creating...' : 'Create Version'}
            </Button>
          ) : (
            <Button
              variant="primary"
              icon={<ChevronRight className="w-4 h-4" />}
              onClick={handleNext}
              disabled={!canProceed}
            >
              Continue
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

function ReviewItem({ 
  label, 
  value, 
  subValue,
  variant = 'default' 
}: { 
  label: string; 
  value: string; 
  subValue?: string;
  variant?: 'default' | 'success' | 'muted';
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-sm text-text-muted w-32 flex-shrink-0">{label}</span>
      <div className="flex-1">
        <span className={`
          text-sm 
          ${variant === 'success' ? 'text-status-success' : variant === 'muted' ? 'text-text-muted' : 'text-text-primary'}
        `}>
          {value}
        </span>
        {subValue && (
          <p className="text-xs text-text-muted mt-0.5">{subValue}</p>
        )}
      </div>
    </div>
  );
}

export default VersionCreationWizard;
