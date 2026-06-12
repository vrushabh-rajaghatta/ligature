

// =============================================================================
// USE COLLABORATION HOOK
// =============================================================================
// React hook for managing real-time collaboration state and interactions
// Part of v0.18.9 - Collaboration UI Components
// =============================================================================

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  SessionManager,
  CollaborativeSession,
  SessionParticipant,
  JoinSessionResult,
  ContentEdit,
  SessionManagerStats,
} from '@/services/collaboration/session-manager';
import type { RemoteCursor, CursorUpdate, SelectionUpdate } from '@/services/collaboration/cursor-sync';
import type { UserPresence, PresenceStatus } from '@/services/collaboration/presence-service';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface UseCollaborationOptions {
  tenantId: string;
  userId: string;
  userName: string;
  documentId?: string;
  autoConnect?: boolean;
  autoReconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  onSessionCreated?: (session: CollaborativeSession) => void;
  onSessionJoined?: (result: JoinSessionResult) => void;
  onSessionLeft?: () => void;
  onParticipantJoined?: (participant: SessionParticipant) => void;
  onParticipantLeft?: (userId: string) => void;
  onContentChanged?: (content: string, edit: ContentEdit) => void;
  onCursorsUpdated?: (cursors: RemoteCursor[]) => void;
  onError?: (error: Error) => void;
}

export interface UseCollaborationReturn {
  // State
  session: CollaborativeSession | null;
  participants: SessionParticipant[];
  cursors: RemoteCursor[];
  content: string;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  stats: SessionManagerStats | null;
  
  // Actions
  createSession: (content?: string) => Promise<CollaborativeSession>;
  joinSession: (sessionId: string) => Promise<JoinSessionResult>;
  leaveSession: () => Promise<void>;
  editContent: (edit: ContentEdit) => Promise<string>;
  updateCursor: (update: CursorUpdate) => void;
  updateSelection: (update: SelectionUpdate) => void;
  updatePresence: (status: PresenceStatus) => void;
  reconnect: () => Promise<void>;
  
  // Queries
  getParticipant: (userId: string) => SessionParticipant | undefined;
  getCursor: (userId: string) => RemoteCursor | undefined;
  isLocalUser: (userId: string) => boolean;
}

export interface CollaborationState {
  session: CollaborativeSession | null;
  participants: SessionParticipant[];
  cursors: RemoteCursor[];
  content: string;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  reconnectAttempts: number;
}

// -----------------------------------------------------------------------------
// Default Configuration
// -----------------------------------------------------------------------------

const DEFAULT_OPTIONS: Partial<UseCollaborationOptions> = {
  autoConnect: true,
  autoReconnect: true,
  reconnectInterval: 3000,
  maxReconnectAttempts: 5,
};

// -----------------------------------------------------------------------------
// Hook Implementation
// -----------------------------------------------------------------------------

export function useCollaboration(options: UseCollaborationOptions): UseCollaborationReturn {
  const config = useMemo(() => ({ ...DEFAULT_OPTIONS, ...options }), [options]);
  
  // State
  const [state, setState] = useState<CollaborationState>({
    session: null,
    participants: [],
    cursors: [],
    content: '',
    isConnected: false,
    isConnecting: false,
    error: null,
    reconnectAttempts: 0,
  });
  
  const [stats, setStats] = useState<SessionManagerStats | null>(null);
  
  // Refs for stable callbacks
  const managerRef = useRef<SessionManager | null>(null);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const optionsRef = useRef(config);
  optionsRef.current = config;

  // Initialize session manager
  useEffect(() => {
    const manager = new SessionManager({ tenantId: config.tenantId });
    managerRef.current = manager;

    // Set up event listeners
    manager.on('session_created', (session: CollaborativeSession) => {
      setState(prev => ({ ...prev, session }));
      optionsRef.current.onSessionCreated?.(session);
    });

    manager.on('participant_joined', (participant: SessionParticipant) => {
      setState(prev => ({
        ...prev,
        participants: [...prev.participants, participant],
      }));
      optionsRef.current.onParticipantJoined?.(participant);
    });

    manager.on('participant_left', (userId: string) => {
      setState(prev => ({
        ...prev,
        participants: prev.participants.filter(p => p.userId !== userId),
        cursors: prev.cursors.filter(c => c.userId !== userId),
      }));
      optionsRef.current.onParticipantLeft?.(userId);
    });

    manager.on('content_changed', ({ edit, newContent }: { edit: ContentEdit; newContent: string }) => {
      setState(prev => ({ ...prev, content: newContent }));
      optionsRef.current.onContentChanged?.(newContent, edit);
    });

    manager.on('cursor_updated', (cursor: RemoteCursor) => {
      setState(prev => {
        const existing = prev.cursors.findIndex(c => c.userId === cursor.userId);
        const newCursors = existing >= 0
          ? prev.cursors.map((c, i) => i === existing ? cursor : c)
          : [...prev.cursors, cursor];
        return { ...prev, cursors: newCursors };
      });
    });

    // Periodic stats update
    const statsInterval = setInterval(() => {
      if (managerRef.current) {
        setStats(managerRef.current.getStats());
      }
    }, 5000);

    return () => {
      clearInterval(statsInterval);
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      manager.shutdown();
    };
  }, [config.tenantId]);

  // Create session
  const createSession = useCallback(async (initialContent = ''): Promise<CollaborativeSession> => {
    const manager = managerRef.current;
    if (!manager) {
      throw new Error('Session manager not initialized');
    }

    if (!config.documentId) {
      throw new Error('Document ID is required');
    }

    setState(prev => ({ ...prev, isConnecting: true, error: null }));

    try {
      const session = await manager.createSession(
        config.documentId,
        config.userId,
        initialContent
      );

      // Join the session as creator
      const result = await manager.joinSession(
        session.id,
        config.userId,
        config.userName,
        'owner'
      );

      setState(prev => ({
        ...prev,
        session,
        participants: [result.participant, ...result.otherParticipants],
        content: result.currentContent,
        isConnected: true,
        isConnecting: false,
        reconnectAttempts: 0,
      }));

      config.onSessionJoined?.(result);
      return session;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create session';
      setState(prev => ({ 
        ...prev, 
        isConnecting: false, 
        error: message,
      }));
      config.onError?.(error instanceof Error ? error : new Error(message));
      throw error;
    }
  }, [config]);

  // Join session
  const joinSession = useCallback(async (sessionId: string): Promise<JoinSessionResult> => {
    const manager = managerRef.current;
    if (!manager) {
      throw new Error('Session manager not initialized');
    }

    setState(prev => ({ ...prev, isConnecting: true, error: null }));

    try {
      const result = await manager.joinSession(
        sessionId,
        config.userId,
        config.userName,
        'editor'
      );

      setState(prev => ({
        ...prev,
        session: result.session,
        participants: [result.participant, ...result.otherParticipants],
        content: result.currentContent,
        isConnected: true,
        isConnecting: false,
        reconnectAttempts: 0,
      }));

      config.onSessionJoined?.(result);

      // Collect existing cursors
      const cursorService = manager.getCursorSyncService();
      const documentCursors = cursorService.getDocumentCursors(result.session.documentId);
      setState(prev => ({ ...prev, cursors: documentCursors }));
      config.onCursorsUpdated?.(documentCursors);

      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to join session';
      setState(prev => ({ 
        ...prev, 
        isConnecting: false, 
        error: message,
      }));
      config.onError?.(error instanceof Error ? error : new Error(message));
      throw error;
    }
  }, [config]);

  // Leave session
  const leaveSession = useCallback(async (): Promise<void> => {
    const manager = managerRef.current;
    if (!manager || !state.session) return;

    try {
      await manager.leaveSession(state.session.id, config.userId);
      
      setState(prev => ({
        ...prev,
        session: null,
        participants: [],
        cursors: [],
        content: '',
        isConnected: false,
      }));

      config.onSessionLeft?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to leave session';
      setState(prev => ({ ...prev, error: message }));
      config.onError?.(error instanceof Error ? error : new Error(message));
    }
  }, [state.session, config]);

  // Edit content
  const editContent = useCallback(async (edit: ContentEdit): Promise<string> => {
    const manager = managerRef.current;
    if (!manager || !state.session) {
      throw new Error('Not in a session');
    }

    try {
      const newContent = await manager.processEdit({
        ...edit,
        sessionId: state.session.id,
        userId: config.userId,
      });
      
      setState(prev => ({ ...prev, content: newContent }));
      return newContent;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to edit content';
      setState(prev => ({ ...prev, error: message }));
      config.onError?.(error instanceof Error ? error : new Error(message));
      throw error;
    }
  }, [state.session, config]);

  // Update cursor
  const updateCursor = useCallback((update: CursorUpdate): void => {
    const manager = managerRef.current;
    if (!manager || !state.session) return;

    manager.updateCursor(state.session.id, {
      ...update,
      userId: config.userId,
      documentId: state.session.documentId,
    });
  }, [state.session, config.userId]);

  // Update selection
  const updateSelection = useCallback((update: SelectionUpdate): void => {
    const manager = managerRef.current;
    if (!manager || !state.session) return;

    manager.updateSelection(state.session.id, {
      ...update,
      userId: config.userId,
      documentId: state.session.documentId,
    });
  }, [state.session, config.userId]);

  // Update presence
  const updatePresence = useCallback((status: PresenceStatus): void => {
    const manager = managerRef.current;
    if (!manager || !state.session) return;

    manager.updatePresence(state.session.id, {
      userId: config.userId,
      documentId: state.session.documentId,
      status,
    });
  }, [state.session, config.userId]);

  // Reconnect
  const reconnect = useCallback(async (): Promise<void> => {
    if (!state.session) return;

    const maxAttempts = config.maxReconnectAttempts || 5;
    if (state.reconnectAttempts >= maxAttempts) {
      setState(prev => ({
        ...prev,
        error: 'Maximum reconnection attempts reached',
        isConnecting: false,
      }));
      return;
    }

    setState(prev => ({
      ...prev,
      isConnecting: true,
      reconnectAttempts: prev.reconnectAttempts + 1,
    }));

    try {
      await joinSession(state.session.id);
    } catch {
      // Schedule retry if auto-reconnect is enabled
      if (config.autoReconnect && state.reconnectAttempts < maxAttempts) {
        reconnectTimerRef.current = setTimeout(() => {
          reconnect();
        }, config.reconnectInterval);
      }
    }
  }, [state.session, state.reconnectAttempts, config, joinSession]);

  // Auto-reconnect on disconnect
  useEffect(() => {
    if (!state.isConnected && state.session && config.autoReconnect) {
      const timer = setTimeout(() => {
        reconnect();
      }, config.reconnectInterval);

      return () => clearTimeout(timer);
    }
  }, [state.isConnected, state.session, config.autoReconnect, config.reconnectInterval, reconnect]);

  // Query helpers
  const getParticipant = useCallback((userId: string): SessionParticipant | undefined => {
    return state.participants.find(p => p.userId === userId);
  }, [state.participants]);

  const getCursor = useCallback((userId: string): RemoteCursor | undefined => {
    return state.cursors.find(c => c.userId === userId);
  }, [state.cursors]);

  const isLocalUser = useCallback((userId: string): boolean => {
    return userId === config.userId;
  }, [config.userId]);

  return {
    // State
    session: state.session,
    participants: state.participants,
    cursors: state.cursors,
    content: state.content,
    isConnected: state.isConnected,
    isConnecting: state.isConnecting,
    error: state.error,
    stats,
    
    // Actions
    createSession,
    joinSession,
    leaveSession,
    editContent,
    updateCursor,
    updateSelection,
    updatePresence,
    reconnect,
    
    // Queries
    getParticipant,
    getCursor,
    isLocalUser,
  };
}

// -----------------------------------------------------------------------------
// Presence Hook
// -----------------------------------------------------------------------------

export interface UsePresenceOptions {
  userId: string;
  sessionId?: string;
  idleTimeout?: number;
  awayTimeout?: number;
}

export interface UsePresenceReturn {
  status: PresenceStatus;
  setStatus: (status: PresenceStatus) => void;
  isActive: boolean;
  isIdle: boolean;
  isAway: boolean;
}

export function usePresence(options: UsePresenceOptions): UsePresenceReturn {
  const { userId, idleTimeout = 60000, awayTimeout = 300000 } = options;
  
  const [status, setStatus] = useState<PresenceStatus>('active');
  const lastActivityRef = useRef<number>(Date.now());
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const awayTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Track user activity
  const resetActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    
    if (status !== 'active') {
      setStatus('active');
    }

    // Reset idle timer
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
    }
    idleTimerRef.current = setTimeout(() => {
      setStatus('idle');
    }, idleTimeout);

    // Reset away timer
    if (awayTimerRef.current) {
      clearTimeout(awayTimerRef.current);
    }
    awayTimerRef.current = setTimeout(() => {
      setStatus('away');
    }, awayTimeout);
  }, [status, idleTimeout, awayTimeout]);

  // Set up activity listeners
  useEffect(() => {
    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
    
    events.forEach(event => {
      window.addEventListener(event, resetActivity);
    });

    // Initial activity
    resetActivity();

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, resetActivity);
      });
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (awayTimerRef.current) clearTimeout(awayTimerRef.current);
    };
  }, [resetActivity]);

  return {
    status,
    setStatus,
    isActive: status === 'active',
    isIdle: status === 'idle',
    isAway: status === 'away',
  };
}

// -----------------------------------------------------------------------------
// Cursor Tracking Hook
// -----------------------------------------------------------------------------

export interface UseCursorTrackingOptions {
  documentId: string;
  userId: string;
  throttleMs?: number;
  onCursorUpdate?: (update: CursorUpdate) => void;
  onSelectionUpdate?: (update: SelectionUpdate) => void;
}

export interface UseCursorTrackingReturn {
  cursorPosition: number;
  selection: { anchor: number; head: number } | null;
  handleCursorChange: (position: number, line?: number, column?: number) => void;
  handleSelectionChange: (anchor: number, head: number) => void;
}

export function useCursorTracking(options: UseCursorTrackingOptions): UseCursorTrackingReturn {
  const { documentId, userId, throttleMs = 50, onCursorUpdate, onSelectionUpdate } = options;
  
  const [cursorPosition, setCursorPosition] = useState(0);
  const [selection, setSelection] = useState<{ anchor: number; head: number } | null>(null);
  const lastUpdateRef = useRef<number>(0);

  const handleCursorChange = useCallback((position: number, line?: number, column?: number) => {
    const now = Date.now();
    if (now - lastUpdateRef.current < throttleMs) return;
    lastUpdateRef.current = now;

    setCursorPosition(position);
    setSelection(null);
    
    onCursorUpdate?.({
      userId,
      documentId,
      position,
      line,
      column,
    });
  }, [documentId, userId, throttleMs, onCursorUpdate]);

  const handleSelectionChange = useCallback((anchor: number, head: number) => {
    const now = Date.now();
    if (now - lastUpdateRef.current < throttleMs) return;
    lastUpdateRef.current = now;

    setSelection({ anchor, head });
    
    onSelectionUpdate?.({
      userId,
      documentId,
      anchor,
      head,
    });
  }, [documentId, userId, throttleMs, onSelectionUpdate]);

  return {
    cursorPosition,
    selection,
    handleCursorChange,
    handleSelectionChange,
  };
}

// -----------------------------------------------------------------------------
// Exports
// -----------------------------------------------------------------------------

export default useCollaboration;
