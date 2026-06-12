



import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Highlight from '@tiptap/extension-highlight';
import Underline from '@tiptap/extension-underline';
import {
  Save, Clock, CheckCircle, Wand2, Trash2, FileText, Send,
  Bold, Italic, Underline as UnderlineIcon, List, ListOrdered,
  Heading2, Quote, Undo, Redo, History, ChevronDown, RotateCcw,
  Brain, Sparkles, Loader2, Zap
} from 'lucide-react';
import { useHAQStore } from '@/store/useHAQStore';
import { useToast } from '@/components/ui/Toast';
import { useHAQRAG } from '@/hooks/useHAQRAG';
import type { HAQuestion, ResponseDraft } from '@/types/haq';

interface HAQResponseEditorV2Props {
  haq: HAQuestion;
  mode?: 'quick' | 'full';
  onGenerateAI?: () => void;
  isGeneratingAI?: boolean;
  aiResponse?: string;
  onAcceptAI?: () => void;
  onDiscardAI?: () => void;
  onSubmitForReview?: () => void;
}

// Autosave delay in milliseconds (Office 365 style - constant saving)
const AUTOSAVE_DELAY = 1500;

// Toolbar button component
function ToolbarButton({
  onClick,
  isActive = false,
  disabled = false,
  children,
  title,
}: {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  title: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`p-1.5 rounded hover:bg-surface-elevated transition-colors ${
        isActive ? 'bg-accent-blue/20 text-accent-blue' : 'text-text-muted'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {children}
    </button>
  );
}

export function HAQResponseEditorV2({
  haq,
  mode = 'quick',
  onGenerateAI,
  isGeneratingAI = false,
  aiResponse,
  onAcceptAI,
  onDiscardAI,
  onSubmitForReview,
}: HAQResponseEditorV2Props) {
  const saveDraft = useHAQStore(s => s.saveDraft);
  const getDraft = useHAQStore(s => s.getDraft);
  const clearDraft = useHAQStore(s => s.clearDraft);
  const updateHAQStatus = useHAQStore(s => s.updateHAQStatus);
  const createVersion = useHAQStore(s => s.createVersion);
  const getVersions = useHAQStore(s => s.getVersions);
  const restoreVersion = useHAQStore(s => s.restoreVersion);
  const toast = useToast();

  // Quick Suggest RAG integration
  const {
    state: ragState,
    metrics: ragMetrics,
    generateDraft: ragGenerateDraft,
    cancel: ragCancel,
    isSearching: ragIsSearching,
    isStreaming: ragIsStreaming,
    isComplete: ragIsComplete,
  } = useHAQRAG({
    onComplete: (draft) => {
      // Auto-insert generated draft into editor
      if (editor && draft) {
        editor.commands.setContent(draft);
        setHasUnsavedChanges(true);
        createVersion(haq.id, draft, true);
        toast.success('RAG-powered draft generated', {
          description: `Based on ${ragState.similarResponses.length} similar historical responses`
        });
      }
    },
  });
  
  const [showQuickSuggestBanner, setShowQuickSuggestBanner] = useState(false);

  // Get existing draft or use response text
  const existingDraft = getDraft(haq.id);
  const initialContent = existingDraft?.content ?? haq.responseText ?? '';

  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(
    existingDraft?.lastSaved ?? null
  );
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);

  const autosaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const versions = getVersions(haq.id);

  // Quick Suggest handler
  const handleQuickSuggest = useCallback(() => {
    setShowQuickSuggestBanner(true);
    ragGenerateDraft({
      questionText: haq.questionText,
      discipline: haq.discipline,
      ctdSection: haq.ctdSection,
      source: haq.source,
      productName: haq.productName,
    });
  }, [haq, ragGenerateDraft]);

  // Hide banner when complete
  useEffect(() => {
    if (ragIsComplete) {
      const timer = setTimeout(() => setShowQuickSuggestBanner(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [ragIsComplete]);

  // Initialize Tiptap editor
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [2, 3],
        },
      }),
      Placeholder.configure({
        placeholder: 'Enter your response here...',
      }),
      Highlight,
      Underline,
    ],
    content: initialContent,
    immediatelyRender: false, // Prevent SSR hydration mismatch
    editorProps: {
      attributes: {
        class:
          'prose prose-sm max-w-none focus:outline-none min-h-[200px] px-4 py-3 text-text-primary',
      },
    },
    onUpdate: ({ editor }) => {
      setHasUnsavedChanges(true);
    },
  });

  // Word count
  const wordCount = editor?.getText().split(/\s+/).filter(Boolean).length ?? 0;
  const charCount = editor?.getText().length ?? 0;

  // Save draft function (autosave)
  const handleSave = useCallback(() => {
    if (!editor) return;
    const content = editor.getHTML();
    if (!content.trim() || content === '<p></p>') return;

    setIsSaving(true);
    saveDraft(haq.id, content);
    setLastSaved(new Date());
    setHasUnsavedChanges(false);
    setIsSaving(false);

    // If this is the first draft, auto-advance status to in-progress
    if (haq.status === 'new' || haq.status === 'open') {
      updateHAQStatus(haq.id, 'in-progress');
    }
  }, [editor, haq.id, haq.status, saveDraft, updateHAQStatus]);

  // Autosave effect (Office 365 style)
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

  // Update editor content when AI response is accepted
  useEffect(() => {
    if (aiResponse && editor) {
      // Don't set content here - wait for explicit accept
    }
  }, [aiResponse, editor]);

  // Handle accept AI response
  const handleAcceptAI = useCallback(() => {
    if (aiResponse && editor) {
      editor.commands.setContent(aiResponse);
      setHasUnsavedChanges(true);
      // Create a version for the AI-generated content
      createVersion(haq.id, aiResponse, true);
      onAcceptAI?.();
      toast.success('AI draft accepted');
    }
  }, [aiResponse, editor, haq.id, createVersion, onAcceptAI, toast]);

  // Handle save as version (explicit - Office 365 style)
  const handleSaveVersion = useCallback(() => {
    if (!editor) return;
    const content = editor.getHTML();
    if (!content.trim() || content === '<p></p>') {
      toast.error('Cannot save empty version');
      return;
    }

    handleSave(); // Save draft first
    createVersion(haq.id, content, false);
    toast.success(`Version ${versions.length + 1} saved`);
  }, [editor, haq.id, createVersion, versions.length, handleSave, toast]);

  // Handle restore version
  const handleRestoreVersion = useCallback(
    (version: ResponseDraft) => {
      if (!editor) return;
      editor.commands.setContent(version.content);
      setHasUnsavedChanges(true);
      setShowVersionHistory(false);
      toast.info(`Restored to version ${version.version}`);
    },
    [editor, toast]
  );

  // Handle discard draft
  const handleDiscardDraft = useCallback(() => {
    clearDraft(haq.id);
    editor?.commands.setContent(haq.responseText ?? '');
    setLastSaved(null);
    setHasUnsavedChanges(false);
    toast.info('Draft discarded');
  }, [clearDraft, editor, haq.id, haq.responseText, toast]);

  // Handle submit for review
  const handleSubmitForReview = useCallback(() => {
    handleSave();
    // Create a version before submitting
    if (editor) {
      createVersion(haq.id, editor.getHTML(), false);
    }
    updateHAQStatus(haq.id, 'under-review');
    onSubmitForReview?.();
    toast.success('Submitted for review');
  }, [editor, haq.id, createVersion, updateHAQStatus, handleSave, onSubmitForReview, toast]);

  // Format time ago
  const formatTimeAgo = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    const seconds = Math.floor((new Date().getTime() - d.getTime()) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return d.toLocaleDateString();
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
          <span className="text-xs text-text-muted">
            Review and edit before accepting
          </span>
        </div>

        <div className="bg-accent-purple/5 border border-accent-purple/30 rounded-lg p-4">
          <div
            className="text-sm text-text-secondary prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: aiResponse }}
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleAcceptAI}
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
  if (!initialContent && !editor?.getText()) {
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
            onClick={() => editor?.commands.focus()}
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
      {/* Header with status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold text-text-primary">
            Response Draft
          </h3>
          {versions.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setShowVersionHistory(!showVersionHistory)}
                className="text-xs px-2 py-0.5 bg-accent-blue/20 text-accent-blue rounded flex items-center gap-1 hover:bg-accent-blue/30"
              >
                <History className="w-3 h-3" />
                {versions.length} version{versions.length !== 1 ? 's' : ''}
                <ChevronDown className="w-3 h-3" />
              </button>

              {/* Version history dropdown */}
              {showVersionHistory && (
                <div className="absolute top-full left-0 mt-1 w-72 bg-surface-elevated border border-border rounded-lg shadow-lg z-50 max-h-64 overflow-auto">
                  <div className="p-2 border-b border-border">
                    <span className="text-xs text-text-muted uppercase tracking-wider">
                      Version History
                    </span>
                  </div>
                  {versions
                    .slice()
                    .reverse()
                    .map((version) => (
                      <div
                        key={version.id}
                        className="p-2 hover:bg-surface-card border-b border-border last:border-0"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-text-primary">
                            Version {version.version}
                            {version.aiGenerated && (
                              <span className="ml-2 text-xs text-accent-purple">
                                (AI)
                              </span>
                            )}
                          </span>
                          <button
                            onClick={() => handleRestoreVersion(version)}
                            className="text-xs text-accent-blue hover:underline flex items-center gap-1"
                          >
                            <RotateCcw className="w-3 h-3" />
                            Restore
                          </button>
                        </div>
                        <div className="text-xs text-text-muted">
                          {version.authorName} • {formatTimeAgo(version.createdAt)}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
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
          <span className="text-text-muted">
            {wordCount} words • {charCount} chars
          </span>
        </div>
      </div>

      {/* Rich text toolbar */}
      <div className="flex items-center gap-1 p-1 bg-surface-card rounded-lg border border-border">
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleBold().run()}
          isActive={editor?.isActive('bold')}
          title="Bold"
        >
          <Bold className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleItalic().run()}
          isActive={editor?.isActive('italic')}
          title="Italic"
        >
          <Italic className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleUnderline().run()}
          isActive={editor?.isActive('underline')}
          title="Underline"
        >
          <UnderlineIcon className="w-4 h-4" />
        </ToolbarButton>

        <div className="w-px h-5 bg-border mx-1" />

        <ToolbarButton
          onClick={() =>
            editor?.chain().focus().toggleHeading({ level: 2 }).run()
          }
          isActive={editor?.isActive('heading', { level: 2 })}
          title="Heading"
        >
          <Heading2 className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
          isActive={editor?.isActive('bulletList')}
          title="Bullet List"
        >
          <List className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          isActive={editor?.isActive('orderedList')}
          title="Numbered List"
        >
          <ListOrdered className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleBlockquote().run()}
          isActive={editor?.isActive('blockquote')}
          title="Quote"
        >
          <Quote className="w-4 h-4" />
        </ToolbarButton>

        <div className="w-px h-5 bg-border mx-1" />

        <ToolbarButton
          onClick={() => editor?.chain().focus().undo().run()}
          disabled={!editor?.can().undo()}
          title="Undo"
        >
          <Undo className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor?.chain().focus().redo().run()}
          disabled={!editor?.can().redo()}
          title="Redo"
        >
          <Redo className="w-4 h-4" />
        </ToolbarButton>

        <div className="w-px h-5 bg-border mx-1" />
        
        {/* Quick Suggest Button - RAG-powered AI */}
        <button
          onClick={handleQuickSuggest}
          disabled={ragIsSearching || ragIsStreaming}
          title="Quick Suggest - AI drafts using similar historical responses"
          className={`px-2.5 py-1 rounded flex items-center gap-1.5 text-xs font-medium transition-all ${
            ragIsSearching || ragIsStreaming
              ? 'bg-accent-purple/20 text-accent-purple'
              : 'bg-gradient-to-r from-accent-purple to-accent-blue text-white hover:opacity-90 shadow-sm shadow-accent-purple/20'
          }`}
        >
          {ragIsSearching || ragIsStreaming ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              {ragIsSearching ? 'Searching...' : 'Generating...'}
            </>
          ) : (
            <>
              <Brain className="w-3.5 h-3.5" />
              Quick Suggest
            </>
          )}
        </button>
      </div>

      {/* Quick Suggest Progress Banner */}
      {showQuickSuggestBanner && (ragIsSearching || ragIsStreaming) && (
        <div className="bg-gradient-to-r from-accent-purple/10 to-accent-blue/10 border border-accent-purple/30 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-1.5 rounded-lg bg-accent-purple/20">
                <Brain className="w-4 h-4 text-accent-purple animate-pulse" />
              </div>
              <div>
                <div className="text-sm font-medium text-text-primary flex items-center gap-2">
                  {ragIsSearching ? 'Searching historical responses...' : 'Generating draft...'}
                  {ragIsStreaming && (
                    <span className="text-xs text-text-muted">
                      {ragMetrics.wordCount} words
                    </span>
                  )}
                </div>
                <div className="text-xs text-text-muted">
                  {ragState.similarResponses.length > 0 && (
                    <span>Found {ragState.similarResponses.length} similar responses</span>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                ragCancel();
                setShowQuickSuggestBanner(false);
              }}
              className="text-xs text-text-muted hover:text-text-secondary"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Editor */}
      <div
        className="bg-surface-card border border-border rounded-lg overflow-hidden"
        data-testid="haq-response-editor-v2"
      >
        <EditorContent editor={editor} />
      </div>

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
            onClick={handleSaveVersion}
            className="px-3 py-1.5 text-sm bg-surface-elevated text-text-primary rounded-lg flex items-center gap-1.5 hover:bg-surface-card"
          >
            <Save className="w-4 h-4" />
            Save Version
          </button>
          {mode === 'quick' && haq.status !== 'under-review' && (
            <button
              onClick={handleSubmitForReview}
              disabled={!editor?.getText().trim()}
              className="px-4 py-1.5 text-sm bg-accent-blue text-white rounded-lg flex items-center gap-1.5 hover:bg-accent-blue/90 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              Submit for Review
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
