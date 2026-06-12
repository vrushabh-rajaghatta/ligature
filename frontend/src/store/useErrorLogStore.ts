/**
 * useErrorLogStore — v0.122.0
 * Global store tracking every ModuleErrorBoundary catch during the session.
 * Used by the Admin Health Check panel to surface errors without requiring
 * manual reproduction.
 */

import { create } from 'zustand';

export interface ErrorLogEntry {
  id: string;
  moduleName: string;
  moduleId?: string;
  message: string;
  stack?: string;
  componentStack?: string;
  timestamp: string;
}

interface ErrorLogState {
  entries: ErrorLogEntry[];
  logError: (entry: Omit<ErrorLogEntry, 'id' | 'timestamp'>) => void;
  clear: () => void;
}

export const useErrorLogStore = create<ErrorLogState>((set) => ({
  entries: [],
  logError: (entry) =>
    set((s) => ({
      entries: [
        {
          ...entry,
          id: `err-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          timestamp: new Date().toISOString(),
        },
        ...s.entries,
      ].slice(0, 100), // keep last 100
    })),
  clear: () => set({ entries: [] }),
}));
