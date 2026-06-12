/**
 * ConflictResolutionDialog
 * Shows merge conflicts and allows user to resolve them
 * 
 * v0.41.8 - Conflict Resolution UI
 */


import React, { useState, useMemo } from 'react';
import {
  AlertTriangle,
  GitMerge,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  Copy,
  ArrowRight,
  User,
  Clock,
} from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

export interface ConflictVersion {
  userId: string;
  userName: string;
  userColor: string;
  content: string;
  timestamp: number;
  operationType: 'insert' | 'delete' | 'replace';
}

export interface Conflict {
  id: string;
  position: number;
  sectionId?: string;
  sectionTitle?: string;
  context: {
    before: string;  // Text before conflict
    after: string;   // Text after conflict
  };
  local: ConflictVersion;
  remote: ConflictVersion;
  baseContent: string;  // Original content before both edits
}

export interface ConflictResolution {
  conflictId: string;
  resolution: 'local' | 'remote' | 'both' | 'custom';
  customContent?: string;
}

export interface ConflictResolutionDialogProps {
  conflicts: Conflict[];
  onResolve: (resolutions: ConflictResolution[]) => void;
  onCancel: () => void;
}

// =============================================================================
// HELPERS
// =============================================================================

function getTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  return `${Math.floor(seconds / 3600)}h ago`;
}

function highlightDiff(text1: string, text2: string): { text: string; type: 'same' | 'diff' }[] {
  // Simple character-by-character diff for highlighting
  const result: { text: string; type: 'same' | 'diff' }[] = [];
  let i = 0, j = 0;
  let currentType: 'same' | 'diff' = 'same';
  let currentText = '';
  
  while (i < text1.length || j < text2.length) {
    if (text1[i] === text2[j]) {
      if (currentType !== 'same' && currentText) {
        result.push({ text: currentText, type: currentType });
        currentText = '';
      }
      currentType = 'same';
      currentText += text1[i] || '';
      i++;
      j++;
    } else {
      if (currentType !== 'diff' && currentText) {
        result.push({ text: currentText, type: currentType });
        currentText = '';
      }
      currentType = 'diff';
      currentText += text2[j] || text1[i] || '';
      if (text1[i]) i++;
      if (text2[j]) j++;
    }
  }
  
  if (currentText) {
    result.push({ text: currentText, type: currentType });
  }
  
  return result;
}

// =============================================================================
// COMPONENT
// =============================================================================

export default function ConflictResolutionDialog({
  conflicts,
  onResolve,
  onCancel,
}: ConflictResolutionDialogProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [resolutions, setResolutions] = useState<Map<string, ConflictResolution>>(new Map());
  const [customContent, setCustomContent] = useState<Map<string, string>>(new Map());
  const [showCustomEditor, setShowCustomEditor] = useState(false);

  const currentConflict = conflicts[currentIndex];
  const currentResolution = resolutions.get(currentConflict?.id);
  
  const resolvedCount = resolutions.size;
  const totalCount = conflicts.length;
  const allResolved = resolvedCount === totalCount;

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  const setResolution = (resolution: 'local' | 'remote' | 'both' | 'custom', custom?: string) => {
    const newResolutions = new Map(resolutions);
    newResolutions.set(currentConflict.id, {
      conflictId: currentConflict.id,
      resolution,
      customContent: custom,
    });
    setResolutions(newResolutions);
    
    if (custom) {
      const newCustom = new Map(customContent);
      newCustom.set(currentConflict.id, custom);
      setCustomContent(newCustom);
    }
    
    setShowCustomEditor(false);
  };

  const goToConflict = (index: number) => {
    if (index >= 0 && index < conflicts.length) {
      setCurrentIndex(index);
      setShowCustomEditor(false);
    }
  };

  const handleSubmit = () => {
    const allResolutions = Array.from(resolutions.values());
    onResolve(allResolutions);
  };

  // ---------------------------------------------------------------------------
  // Merged Preview
  // ---------------------------------------------------------------------------

  const getMergedPreview = (): string => {
    if (!currentResolution) return currentConflict.baseContent;
    
    switch (currentResolution.resolution) {
      case 'local':
        return currentConflict.local.content;
      case 'remote':
        return currentConflict.remote.content;
      case 'both':
        return currentConflict.local.content + currentConflict.remote.content;
      case 'custom':
        return currentResolution.customContent || currentConflict.baseContent;
      default:
        return currentConflict.baseContent;
    }
  };

  if (!currentConflict) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-[#1a1f28] rounded-xl shadow-2xl w-[900px] max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
              <GitMerge className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Resolve Conflicts</h2>
              <p className="text-sm text-gray-400">
                {resolvedCount} of {totalCount} conflicts resolved
              </p>
            </div>
          </div>
          
          <button
            onClick={onCancel}
            className="p-2 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="h-1 bg-white/5">
          <div 
            className="h-full bg-emerald-500 transition-all"
            style={{ width: `${(resolvedCount / totalCount) * 100}%` }}
          />
        </div>

        {/* Navigation */}
        <div className="px-4 py-2 border-b border-white/5 flex items-center justify-between">
          <button
            onClick={() => goToConflict(currentIndex - 1)}
            disabled={currentIndex === 0}
            className="flex items-center gap-1 px-2 py-1 text-sm text-gray-400 hover:text-white 
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </button>
          
          <div className="flex items-center gap-2">
            {conflicts.map((_, idx) => (
              <button
                key={idx}
                onClick={() => goToConflict(idx)}
                className={`w-8 h-8 rounded-full text-sm font-medium transition-colors
                  ${idx === currentIndex 
                    ? 'bg-blue-600 text-white' 
                    : resolutions.has(conflicts[idx].id)
                      ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                      : 'bg-white/5 text-gray-400 hover:bg-white/10'
                  }`}
              >
                {idx + 1}
              </button>
            ))}
          </div>
          
          <button
            onClick={() => goToConflict(currentIndex + 1)}
            disabled={currentIndex === conflicts.length - 1}
            className="flex items-center gap-1 px-2 py-1 text-sm text-gray-400 hover:text-white 
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {/* Section Info */}
          {currentConflict.sectionTitle && (
            <div className="mb-4 px-3 py-2 bg-white/5 rounded-lg text-sm text-gray-400">
              Section: <span className="text-white">{currentConflict.sectionTitle}</span>
            </div>
          )}

          {/* Context */}
          <div className="mb-4 text-sm text-gray-500 font-mono">
            <span className="text-gray-600">...</span>
            {currentConflict.context.before}
            <span className="bg-amber-500/20 text-amber-300 px-1">⚡ CONFLICT</span>
            {currentConflict.context.after}
            <span className="text-gray-600">...</span>
          </div>

          {/* Comparison */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            {/* Local Changes */}
            <div className={`rounded-lg border transition-colors ${
              currentResolution?.resolution === 'local' 
                ? 'border-blue-500 bg-blue-500/5' 
                : 'border-white/10 bg-[#252d3a]'
            }`}>
              <div className="p-3 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium"
                    style={{ backgroundColor: currentConflict.local.userColor }}
                  >
                    {currentConflict.local.userName[0]}
                  </div>
                  <span className="text-sm font-medium text-white">
                    Your Changes
                  </span>
                </div>
                <span className="text-xs text-gray-500">
                  {getTimeAgo(currentConflict.local.timestamp)}
                </span>
              </div>
              <div className="p-3">
                <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono">
                  {currentConflict.local.content || <span className="text-gray-500 italic">(deleted)</span>}
                </pre>
              </div>
              <div className="p-2 border-t border-white/10">
                <button
                  onClick={() => setResolution('local')}
                  className={`w-full py-2 rounded-lg text-sm font-medium transition-colors ${
                    currentResolution?.resolution === 'local'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white/5 text-gray-300 hover:bg-white/10'
                  }`}
                >
                  Use Mine
                </button>
              </div>
            </div>

            {/* Remote Changes */}
            <div className={`rounded-lg border transition-colors ${
              currentResolution?.resolution === 'remote' 
                ? 'border-purple-500 bg-purple-500/5' 
                : 'border-white/10 bg-[#252d3a]'
            }`}>
              <div className="p-3 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium"
                    style={{ backgroundColor: currentConflict.remote.userColor }}
                  >
                    {currentConflict.remote.userName[0]}
                  </div>
                  <span className="text-sm font-medium text-white">
                    {currentConflict.remote.userName}'s Changes
                  </span>
                </div>
                <span className="text-xs text-gray-500">
                  {getTimeAgo(currentConflict.remote.timestamp)}
                </span>
              </div>
              <div className="p-3">
                <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono">
                  {currentConflict.remote.content || <span className="text-gray-500 italic">(deleted)</span>}
                </pre>
              </div>
              <div className="p-2 border-t border-white/10">
                <button
                  onClick={() => setResolution('remote')}
                  className={`w-full py-2 rounded-lg text-sm font-medium transition-colors ${
                    currentResolution?.resolution === 'remote'
                      ? 'bg-purple-600 text-white'
                      : 'bg-white/5 text-gray-300 hover:bg-white/10'
                  }`}
                >
                  Use Theirs
                </button>
              </div>
            </div>
          </div>

          {/* Additional Options */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setResolution('both')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                currentResolution?.resolution === 'both'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white/5 text-gray-300 hover:bg-white/10'
              }`}
            >
              Keep Both
            </button>
            <button
              onClick={() => setShowCustomEditor(true)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                currentResolution?.resolution === 'custom'
                  ? 'bg-amber-600 text-white'
                  : 'bg-white/5 text-gray-300 hover:bg-white/10'
              }`}
            >
              Edit Manually
            </button>
          </div>

          {/* Custom Editor */}
          {showCustomEditor && (
            <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
              <label className="block text-sm font-medium text-amber-400 mb-2">
                Custom Resolution
              </label>
              <textarea
                value={customContent.get(currentConflict.id) || currentConflict.baseContent}
                onChange={(e) => {
                  const newCustom = new Map(customContent);
                  newCustom.set(currentConflict.id, e.target.value);
                  setCustomContent(newCustom);
                }}
                className="w-full h-32 bg-[#1a1f28] border border-white/10 rounded-lg px-3 py-2 
                           text-sm text-white font-mono resize-none focus:outline-none focus:border-amber-500/50"
              />
              <div className="flex justify-end gap-2 mt-2">
                <button
                  onClick={() => setShowCustomEditor(false)}
                  className="px-3 py-1 text-sm text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={() => setResolution('custom', customContent.get(currentConflict.id))}
                  className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white text-sm rounded-lg"
                >
                  Apply Custom
                </button>
              </div>
            </div>
          )}

          {/* Preview */}
          {currentResolution && (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-emerald-400">Result Preview</span>
                <span className="text-xs text-gray-500">
                  Resolution: {currentResolution.resolution}
                </span>
              </div>
              <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono">
                {getMergedPreview() || <span className="text-gray-500 italic">(empty)</span>}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 flex items-center justify-between">
          <div className="text-sm text-gray-400">
            {allResolved ? (
              <span className="text-emerald-400">✓ All conflicts resolved</span>
            ) : (
              <span>{totalCount - resolvedCount} conflict(s) remaining</span>
            )}
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!allResolved}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-600 
                         disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg 
                         transition-colors flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              Apply Resolutions
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// MINI CONFLICT INDICATOR
// =============================================================================

export function ConflictIndicator({
  conflictCount,
  onClick,
}: {
  conflictCount: number;
  onClick: () => void;
}) {
  if (conflictCount === 0) return null;
  
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/20 border border-amber-500/30 
                 rounded-lg text-amber-400 text-sm font-medium hover:bg-amber-500/30 transition-colors"
    >
      <AlertTriangle className="w-4 h-4" />
      {conflictCount} Conflict{conflictCount !== 1 ? 's' : ''}
    </button>
  );
}
