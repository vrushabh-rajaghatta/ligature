

import { useState, useEffect, useCallback, useRef } from 'react';
import { Save, Clock, CheckCircle, Wand2, Trash2, FileText } from 'lucide-react';
import { useHAQStore } from '@/store/useHAQStore';
import { useToast } from '@/components/ui/Toast';
import type { HAQuestion } from '@/types/haq';

interface HAQResponseEditorProps {
  haq: HAQuestion;
  onGenerateAI?: () => void;
  isGeneratingAI?: boolean;
  aiResponse?: string;
  onAcceptAI?: () => void;
  onDiscardAI?: () => void;
}

// Autosave delay in milliseconds
const AUTOSAVE_DELAY = 1500;

export function HAQResponseEditor({
  haq,
  onGenerateAI,
  isGeneratingAI = false,
  aiResponse,
  onAcceptAI,
  onDiscardAI,
}: HAQResponseEditorProps) {
  const saveDraft = useHAQStore(s => s.saveDraft);
  const getDraft = useHAQStore(s => s.getDraft);
  const clearDraft = useHAQStore(s => s.clearDraft);
  const updateHAQStatus = useHAQStore(s => s.updateHAQStatus);
  const toast = useToast();
  
  // Get existing draft or use response text
  const existingDraft = getDraft(haq.id);
  const initialContent = existingDraft?.content ?? haq.responseText ?? '';
  
  const [content, setContent] = useState(initialContent);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(existingDraft?.lastSaved ?? null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  const autosaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Word count
  const wordCount = content.split(/\s+/).filter(Boolean).length;

  // Save draft function
  const handleSave = useCallback(() => {
    if (!content.trim()) return;
    
    setIsSaving(true);
    saveDraft(haq.id, content);
    setLastSaved(new Date());
    setHasUnsavedChanges(false);
    setIsSaving(false);
    
    // If this is the first draft, auto-advance status to in-progress
    if (haq.status === 'new' || haq.status === 'open') {
      updateHAQStatus(haq.id, 'in-progress');
    }
  }, [content, haq.id, haq.status, saveDraft, updateHAQStatus]);

  // Autosave effect
  useEffect(() => {
    if (!hasUnsavedChanges) return;
    
    // Clear existing timer
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }
    
    // Set new timer
    autosaveTimerRef.current = setTimeout(() => {
      handleSave();
    }, AUTOSAVE_DELAY);
    
    // Cleanup
    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
    };
  }, [hasUnsavedChanges, handleSave]);

  // Handle content change
  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    setHasUnsavedChanges(true);
  };

  // Handle discard draft
  const handleDiscardDraft = () => {
    clearDraft(haq.id);
    setContent(haq.responseText ?? '');
    setLastSaved(null);
    setHasUnsavedChanges(false);
    setIsEditing(false);
    toast.info('Draft discarded');
  };

  // Handle mark as ready
  const handleMarkReady = () => {
    handleSave();
    updateHAQStatus(haq.id, 'draft-ready');
    toast.success('Response marked as ready for review');
  };

  // Format time ago
  const formatTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  };

  // If AI response is being shown
  if (aiResponse) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
            <Wand2 className="w-4 h-4 text-accent-purple" />
            AI-Generated Draft
          </h3>
          <span className="text-xs text-text-muted">Review and edit before accepting</span>
        </div>
        
        <div className="bg-accent-purple/5 border border-accent-purple/30 rounded-lg p-4">
          <p className="text-sm text-text-secondary whitespace-pre-wrap">{aiResponse}</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={onAcceptAI}
            className="px-4 py-2 bg-accent-green text-white rounded-lg text-sm flex items-center gap-2 hover:bg-accent-green/90"
          >
            <CheckCircle className="w-4 h-4" />
            Accept & Edit
          </button>
          <button
            onClick={onDiscardAI}
            className="px-4 py-2 text-accent-red hover:bg-accent-red/10 rounded-lg text-sm"
          >
            Discard
          </button>
        </div>
      </div>
    );
  }

  // If no content and not editing, show empty state
  if (!content && !isEditing) {
    return (
      <div className="text-center py-12 border-2 border-dashed border-border rounded-lg">
        <FileText className="w-12 h-12 text-text-muted mx-auto mb-4" />
        <p className="text-text-muted mb-4">No response drafted yet</p>
        <div className="flex justify-center gap-3">
          <button
            onClick={onGenerateAI}
            disabled={isGeneratingAI}
            className="px-4 py-2 bg-accent-purple text-white rounded-lg flex items-center gap-2 disabled:opacity-50"
          >
            <Wand2 className="w-4 h-4" />
            {isGeneratingAI ? 'Generating...' : 'Generate with AI'}
          </button>
          <button
            onClick={() => setIsEditing(true)}
            className="px-4 py-2 bg-surface-card text-text-primary rounded-lg flex items-center gap-2 hover:bg-surface-elevated"
          >
            <FileText className="w-4 h-4" />
            Write Manually
          </button>
        </div>
      </div>
    );
  }

  // Editor mode
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold text-text-primary">Response Draft</h3>
          {existingDraft && (
            <span className="text-xs px-2 py-0.5 bg-accent-blue/20 text-accent-blue rounded">
              Draft saved
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-text-muted">
          {isSaving ? (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3 animate-spin" />
              Saving...
            </span>
          ) : hasUnsavedChanges ? (
            <span className="flex items-center gap-1 text-accent-amber">
              <Clock className="w-3 h-3" />
              Unsaved changes
            </span>
          ) : lastSaved ? (
            <span className="flex items-center gap-1 text-accent-green">
              <CheckCircle className="w-3 h-3" />
              Saved {formatTimeAgo(lastSaved)}
            </span>
          ) : null}
          <span>{wordCount} words</span>
        </div>
      </div>

      {/* Editor */}
      <textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => handleContentChange(e.target.value)}
        placeholder="Enter your response here..."
        className="w-full h-64 bg-surface-card border border-border rounded-lg p-4 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-blue resize-none"
        data-testid="haq-response-editor"
      />

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={onGenerateAI}
            disabled={isGeneratingAI}
            className="px-3 py-1.5 text-sm text-accent-purple hover:bg-accent-purple/10 rounded-lg flex items-center gap-1.5 disabled:opacity-50"
          >
            <Wand2 className="w-4 h-4" />
            {isGeneratingAI ? 'Generating...' : 'Regenerate with AI'}
          </button>
          {existingDraft && (
            <button
              onClick={handleDiscardDraft}
              className="px-3 py-1.5 text-sm text-accent-red hover:bg-accent-red/10 rounded-lg flex items-center gap-1.5"
            >
              <Trash2 className="w-4 h-4" />
              Discard Draft
            </button>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            disabled={!hasUnsavedChanges}
            className="px-3 py-1.5 text-sm bg-surface-elevated text-text-primary rounded-lg flex items-center gap-1.5 hover:bg-surface-card disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            Save Draft
          </button>
          <button
            onClick={handleMarkReady}
            disabled={!content.trim()}
            className="px-4 py-1.5 text-sm bg-accent-green text-white rounded-lg flex items-center gap-1.5 hover:bg-accent-green/90 disabled:opacity-50"
          >
            <CheckCircle className="w-4 h-4" />
            Mark Ready
          </button>
        </div>
      </div>
    </div>
  );
}
