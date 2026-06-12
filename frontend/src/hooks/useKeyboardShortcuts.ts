

/**
 * useKeyboardShortcuts - v117
 * 
 * Global keyboard shortcuts hook for power user navigation.
 * Provides consistent keyboard controls across the platform:
 * 
 * Navigation:
 * - Cmd/Ctrl+K: Open command palette
 * - Cmd/Ctrl+B: Toggle sidebar
 * - Escape: Close modals/panels
 * 
 * Quick Actions:
 * - Cmd/Ctrl+N: New document/item (context-aware)
 * - Cmd/Ctrl+S: Save current item
 * - Cmd/Ctrl+Shift+F: Global search
 * 
 * View Controls:
 * - Cmd/Ctrl+1-9: Switch tabs/views
 * - Cmd/Ctrl+[: Navigate back
 * - Cmd/Ctrl+]: Navigate forward
 */

import { useEffect, useCallback, useRef } from 'react';

export type ShortcutAction = 
  | 'command-palette'
  | 'toggle-sidebar'
  | 'new-item'
  | 'save'
  | 'global-search'
  | 'close'
  | 'navigate-back'
  | 'navigate-forward'
  | 'tab-1' | 'tab-2' | 'tab-3' | 'tab-4' | 'tab-5' 
  | 'tab-6' | 'tab-7' | 'tab-8' | 'tab-9';

export interface ShortcutConfig {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
}

export interface ShortcutHandler {
  action: ShortcutAction;
  handler: () => void;
  enabled?: boolean;
}

// Default shortcut mappings
const DEFAULT_SHORTCUTS: Record<ShortcutAction, ShortcutConfig> = {
  'command-palette': { key: 'k', ctrl: true },
  'toggle-sidebar': { key: 'b', ctrl: true },
  'new-item': { key: 'n', ctrl: true },
  'save': { key: 's', ctrl: true },
  'global-search': { key: 'f', ctrl: true, shift: true },
  'close': { key: 'Escape' },
  'navigate-back': { key: '[', ctrl: true },
  'navigate-forward': { key: ']', ctrl: true },
  'tab-1': { key: '1', ctrl: true },
  'tab-2': { key: '2', ctrl: true },
  'tab-3': { key: '3', ctrl: true },
  'tab-4': { key: '4', ctrl: true },
  'tab-5': { key: '5', ctrl: true },
  'tab-6': { key: '6', ctrl: true },
  'tab-7': { key: '7', ctrl: true },
  'tab-8': { key: '8', ctrl: true },
  'tab-9': { key: '9', ctrl: true },
};

function matchesShortcut(e: KeyboardEvent, config: ShortcutConfig): boolean {
  const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  
  // On Mac, Cmd maps to metaKey; on Windows/Linux, Ctrl maps to ctrlKey
  const modifierKey = isMac ? e.metaKey : e.ctrlKey;
  
  const keyMatches = e.key.toLowerCase() === config.key.toLowerCase();
  const ctrlMatches = config.ctrl ? modifierKey : !modifierKey;
  const shiftMatches = config.shift ? e.shiftKey : !e.shiftKey;
  const altMatches = config.alt ? e.altKey : !e.altKey;
  
  return keyMatches && ctrlMatches && shiftMatches && altMatches;
}

export function useKeyboardShortcuts(handlers: ShortcutHandler[]) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Don't trigger shortcuts when typing in inputs
    const target = e.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable
    ) {
      // Only allow Escape in inputs
      if (e.key !== 'Escape') return;
    }

    for (const { action, handler, enabled = true } of handlersRef.current) {
      if (!enabled) continue;
      
      const config = DEFAULT_SHORTCUTS[action];
      if (config && matchesShortcut(e, config)) {
        e.preventDefault();
        handler();
        return;
      }
    }
  }, []);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

/**
 * Get the display string for a shortcut (e.g., "⌘K" on Mac, "Ctrl+K" on Windows)
 */
export function getShortcutDisplay(action: ShortcutAction): string {
  const config = DEFAULT_SHORTCUTS[action];
  if (!config) return '';
  
  const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  
  const parts: string[] = [];
  
  if (config.ctrl) {
    parts.push(isMac ? '⌘' : 'Ctrl');
  }
  if (config.shift) {
    parts.push(isMac ? '⇧' : 'Shift');
  }
  if (config.alt) {
    parts.push(isMac ? '⌥' : 'Alt');
  }
  
  // Format key nicely
  let keyDisplay = config.key;
  if (config.key === 'Escape') keyDisplay = 'Esc';
  else if (config.key === '[') keyDisplay = '[';
  else if (config.key === ']') keyDisplay = ']';
  else keyDisplay = config.key.toUpperCase();
  
  parts.push(keyDisplay);
  
  return isMac ? parts.join('') : parts.join('+');
}

/**
 * Hook for tab switching via keyboard
 */
export function useTabShortcuts(
  tabCount: number,
  onTabChange: (index: number) => void,
  enabled: boolean = true
) {
  const handlers: ShortcutHandler[] = [];
  
  for (let i = 1; i <= Math.min(tabCount, 9); i++) {
    handlers.push({
      action: `tab-${i}` as ShortcutAction,
      handler: () => onTabChange(i - 1),
      enabled,
    });
  }
  
  useKeyboardShortcuts(handlers);
}

export default useKeyboardShortcuts;
