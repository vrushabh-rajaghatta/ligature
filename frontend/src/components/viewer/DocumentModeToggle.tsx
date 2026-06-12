
import { useState } from 'react';
import { Eye, Edit3, FileText, Monitor } from 'lucide-react';

export type DocumentViewMode = 'draft' | 'document';

interface DocumentModeToggleProps {
  currentMode: DocumentViewMode;
  onChange: (mode: DocumentViewMode) => void;
  className?: string;
  compact?: boolean;
}

export function DocumentModeToggle({
  currentMode,
  onChange,
  className = '',
  compact = false,
}: DocumentModeToggleProps) {
  if (compact) {
    return (
      <div className={`flex items-center gap-1 bg-surface-card rounded-lg p-1 ${className}`}>
        <button
          onClick={() => onChange('draft')}
          className={`p-1.5 rounded transition-colors ${
            currentMode === 'draft'
              ? 'bg-accent-blue/20 text-accent-blue'
              : 'text-text-muted hover:text-text-primary hover:bg-surface'
          }`}
          title="Draft Mode - For editing"
        >
          <Edit3 className="w-4 h-4" />
        </button>
        <button
          onClick={() => onChange('document')}
          className={`p-1.5 rounded transition-colors ${
            currentMode === 'document'
              ? 'bg-accent-blue/20 text-accent-blue'
              : 'text-text-muted hover:text-text-primary hover:bg-surface'
          }`}
          title="Document Mode - Print preview"
        >
          <FileText className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="text-xs text-text-muted mr-1">View:</span>
      <div className="flex items-center gap-1 bg-surface-card rounded-lg p-1">
        <button
          onClick={() => onChange('draft')}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium transition-colors ${
            currentMode === 'draft'
              ? 'bg-accent-blue/20 text-accent-blue'
              : 'text-text-muted hover:text-text-primary hover:bg-surface'
          }`}
        >
          <Edit3 className="w-3.5 h-3.5" />
          Draft
        </button>
        <button
          onClick={() => onChange('document')}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium transition-colors ${
            currentMode === 'document'
              ? 'bg-accent-blue/20 text-accent-blue'
              : 'text-text-muted hover:text-text-primary hover:bg-surface'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          Document
        </button>
      </div>
    </div>
  );
}

// Larger toggle with description for settings/preferences
export function DocumentModeSelector({
  currentMode,
  onChange,
  className = '',
}: DocumentModeToggleProps) {
  return (
    <div className={`space-y-3 ${className}`}>
      <div className="text-sm font-medium text-text-primary">Document View Mode</div>
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => onChange('draft')}
          className={`p-4 rounded-lg border-2 text-left transition-all ${
            currentMode === 'draft'
              ? 'border-accent-blue bg-accent-blue/5'
              : 'border-border hover:border-border-hover bg-surface-card'
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            <div className={`p-2 rounded-lg ${currentMode === 'draft' ? 'bg-accent-blue/20' : 'bg-surface'}`}>
              <Edit3 className={`w-4 h-4 ${currentMode === 'draft' ? 'text-accent-blue' : 'text-text-muted'}`} />
            </div>
            <span className={`text-sm font-medium ${currentMode === 'draft' ? 'text-accent-blue' : 'text-text-primary'}`}>
              Draft Mode
            </span>
          </div>
          <p className="text-xs text-text-muted">
            Optimized for editing with dark theme, comments, and collaboration features.
          </p>
        </button>
        
        <button
          onClick={() => onChange('document')}
          className={`p-4 rounded-lg border-2 text-left transition-all ${
            currentMode === 'document'
              ? 'border-accent-blue bg-accent-blue/5'
              : 'border-border hover:border-border-hover bg-surface-card'
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            <div className={`p-2 rounded-lg ${currentMode === 'document' ? 'bg-accent-blue/20' : 'bg-surface'}`}>
              <FileText className={`w-4 h-4 ${currentMode === 'document' ? 'text-accent-blue' : 'text-text-muted'}`} />
            </div>
            <span className={`text-sm font-medium ${currentMode === 'document' ? 'text-accent-blue' : 'text-text-primary'}`}>
              Document Mode
            </span>
          </div>
          <p className="text-xs text-text-muted">
            Print-faithful view showing documents as they will appear when submitted.
          </p>
        </button>
      </div>
    </div>
  );
}

export default DocumentModeToggle;
