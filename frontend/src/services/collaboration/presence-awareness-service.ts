
/**
 * Presence Awareness Service
 * Tracks user focus, idle state, and activity for collaboration
 * 
 * v0.41.8 - Presence Awareness
 */

// =============================================================================
// TYPES
// =============================================================================

export type PresenceStatus = 'active' | 'idle' | 'away' | 'offline';
export type ActivityType = 'typing' | 'selecting' | 'scrolling' | 'viewing' | 'none';

export interface UserPresence {
  userId: string;
  userName: string;
  userColor: string;
  status: PresenceStatus;
  activity: ActivityType;
  lastActivity: number;
  lastHeartbeat: number;
  focusedElementId?: string;
  focusedSectionId?: string;
  viewportTop?: number;
  viewportBottom?: number;
  isDocumentVisible: boolean;
  isWindowFocused: boolean;
}

export interface PresenceConfig {
  idleTimeout: number;        // ms before idle (default: 60000 = 1 min)
  awayTimeout: number;        // ms before away (default: 300000 = 5 min)
  heartbeatInterval: number;  // ms between heartbeats (default: 5000)
  activityDebounce: number;   // ms to debounce activity (default: 100)
}

export interface PresenceUpdate {
  userId: string;
  status?: PresenceStatus;
  activity?: ActivityType;
  focusedElementId?: string;
  focusedSectionId?: string;
  viewportTop?: number;
  viewportBottom?: number;
}

type PresenceListener = (presence: UserPresence) => void;
type PresenceMapListener = (presences: Map<string, UserPresence>) => void;

// =============================================================================
// DEFAULT CONFIG
// =============================================================================

const DEFAULT_CONFIG: PresenceConfig = {
  idleTimeout: 60000,       // 1 minute
  awayTimeout: 300000,      // 5 minutes
  heartbeatInterval: 5000,  // 5 seconds
  activityDebounce: 100,    // 100ms
};

// =============================================================================
// PRESENCE AWARENESS SERVICE
// =============================================================================

export class PresenceAwarenessService {
  private config: PresenceConfig;
  private userId: string;
  private userName: string;
  private userColor: string;
  private sessionId: string | null = null;
  
  // State
  private localPresence: UserPresence;
  private remotePresences: Map<string, UserPresence> = new Map();
  
  // Timers
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private idleTimer: NodeJS.Timeout | null = null;
  private awayTimer: NodeJS.Timeout | null = null;
  private activityDebounceTimer: NodeJS.Timeout | null = null;
  
  // Listeners
  private localListeners: Set<PresenceListener> = new Set();
  private remoteListeners: Set<PresenceMapListener> = new Set();
  
  // Activity tracking
  private lastActivityTime: number = Date.now();
  private pendingActivity: ActivityType | null = null;

  constructor(
    userId: string,
    userName: string,
    userColor: string,
    config: Partial<PresenceConfig> = {}
  ) {
    this.userId = userId;
    this.userName = userName;
    this.userColor = userColor;
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    this.localPresence = {
      userId,
      userName,
      userColor,
      status: 'active',
      activity: 'none',
      lastActivity: Date.now(),
      lastHeartbeat: Date.now(),
      isDocumentVisible: true,
      isWindowFocused: true,
    };
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  start(sessionId: string): void {
    this.sessionId = sessionId;
    
    // Start heartbeat
    this.heartbeatTimer = setInterval(() => {
      this.sendHeartbeat();
    }, this.config.heartbeatInterval);
    
    // Attach document listeners
    if (typeof window !== 'undefined') {
      document.addEventListener('visibilitychange', this.handleVisibilityChange);
      window.addEventListener('focus', this.handleWindowFocus);
      window.addEventListener('blur', this.handleWindowBlur);
      document.addEventListener('mousemove', this.handleActivity);
      document.addEventListener('keydown', this.handleKeyActivity);
      document.addEventListener('scroll', this.handleScrollActivity, true);
      document.addEventListener('selectionchange', this.handleSelectionActivity);
    }
    
    // Start idle detection
    this.resetIdleTimers();
    
    // Send initial presence
    this.broadcastLocalPresence();
  }

  stop(): void {
    // Clear timers
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    if (this.idleTimer) clearTimeout(this.idleTimer);
    if (this.awayTimer) clearTimeout(this.awayTimer);
    if (this.activityDebounceTimer) clearTimeout(this.activityDebounceTimer);
    
    // Remove listeners
    if (typeof window !== 'undefined') {
      document.removeEventListener('visibilitychange', this.handleVisibilityChange);
      window.removeEventListener('focus', this.handleWindowFocus);
      window.removeEventListener('blur', this.handleWindowBlur);
      document.removeEventListener('mousemove', this.handleActivity);
      document.removeEventListener('keydown', this.handleKeyActivity);
      document.removeEventListener('scroll', this.handleScrollActivity, true);
      document.removeEventListener('selectionchange', this.handleSelectionActivity);
    }
    
    // Broadcast offline
    this.updateLocalStatus('offline');
    this.broadcastLocalPresence();
    
    this.sessionId = null;
  }

  // ---------------------------------------------------------------------------
  // Event Handlers
  // ---------------------------------------------------------------------------

  private handleVisibilityChange = (): void => {
    const isVisible = document.visibilityState === 'visible';
    this.localPresence.isDocumentVisible = isVisible;
    
    if (isVisible) {
      this.updateLocalStatus('active');
      this.resetIdleTimers();
    } else {
      this.updateLocalStatus('away');
    }
  };

  private handleWindowFocus = (): void => {
    this.localPresence.isWindowFocused = true;
    this.updateLocalStatus('active');
    this.resetIdleTimers();
  };

  private handleWindowBlur = (): void => {
    this.localPresence.isWindowFocused = false;
    // Don't immediately go away, just note it
  };

  private handleActivity = (): void => {
    this.recordActivity('viewing');
  };

  private handleKeyActivity = (): void => {
    this.recordActivity('typing');
  };

  private handleScrollActivity = (): void => {
    this.recordActivity('scrolling');
    this.updateViewport();
  };

  private handleSelectionActivity = (): void => {
    const selection = window.getSelection();
    if (selection && selection.toString().length > 0) {
      this.recordActivity('selecting');
    }
  };

  // ---------------------------------------------------------------------------
  // Activity Recording
  // ---------------------------------------------------------------------------

  private recordActivity(activity: ActivityType): void {
    this.lastActivityTime = Date.now();
    this.pendingActivity = activity;
    
    // Debounce activity updates
    if (this.activityDebounceTimer) {
      clearTimeout(this.activityDebounceTimer);
    }
    
    this.activityDebounceTimer = setTimeout(() => {
      if (this.pendingActivity) {
        this.updateLocalActivity(this.pendingActivity);
        this.pendingActivity = null;
      }
    }, this.config.activityDebounce);
    
    // Reset idle timers on any activity
    if (this.localPresence.status !== 'active') {
      this.updateLocalStatus('active');
    }
    this.resetIdleTimers();
  }

  private resetIdleTimers(): void {
    // Clear existing timers
    if (this.idleTimer) clearTimeout(this.idleTimer);
    if (this.awayTimer) clearTimeout(this.awayTimer);
    
    // Set idle timer
    this.idleTimer = setTimeout(() => {
      this.updateLocalStatus('idle');
      this.updateLocalActivity('none');
    }, this.config.idleTimeout);
    
    // Set away timer
    this.awayTimer = setTimeout(() => {
      this.updateLocalStatus('away');
    }, this.config.awayTimeout);
  }

  // ---------------------------------------------------------------------------
  // Status Updates
  // ---------------------------------------------------------------------------

  private updateLocalStatus(status: PresenceStatus): void {
    if (this.localPresence.status !== status) {
      this.localPresence.status = status;
      this.localPresence.lastActivity = Date.now();
      this.notifyLocalListeners();
      this.broadcastLocalPresence();
    }
  }

  private updateLocalActivity(activity: ActivityType): void {
    if (this.localPresence.activity !== activity) {
      this.localPresence.activity = activity;
      this.localPresence.lastActivity = Date.now();
      this.notifyLocalListeners();
      this.broadcastLocalPresence();
    }
  }

  private updateViewport(): void {
    if (typeof window !== 'undefined') {
      this.localPresence.viewportTop = window.scrollY;
      this.localPresence.viewportBottom = window.scrollY + window.innerHeight;
    }
  }

  // ---------------------------------------------------------------------------
  // Public Methods
  // ---------------------------------------------------------------------------

  /**
   * Update focused element/section
   */
  setFocus(elementId?: string, sectionId?: string): void {
    this.localPresence.focusedElementId = elementId;
    this.localPresence.focusedSectionId = sectionId;
    this.recordActivity('viewing');
  }

  /**
   * Get current local presence
   */
  getLocalPresence(): UserPresence {
    return { ...this.localPresence };
  }

  /**
   * Get all remote presences
   */
  getRemotePresences(): Map<string, UserPresence> {
    return new Map(this.remotePresences);
  }

  /**
   * Get presence by user ID
   */
  getPresence(userId: string): UserPresence | undefined {
    if (userId === this.userId) return this.getLocalPresence();
    return this.remotePresences.get(userId);
  }

  /**
   * Get users viewing same section
   */
  getUsersInSection(sectionId: string): UserPresence[] {
    const users: UserPresence[] = [];
    
    if (this.localPresence.focusedSectionId === sectionId) {
      users.push(this.localPresence);
    }
    
    for (const presence of Array.from(Array.from(this.remotePresences.values()))) {
      if (presence.focusedSectionId === sectionId && presence.status !== 'offline') {
        users.push(presence);
      }
    }
    
    return users;
  }

  /**
   * Get active users (not idle/away/offline)
   */
  getActiveUsers(): UserPresence[] {
    const users: UserPresence[] = [];
    
    if (this.localPresence.status === 'active') {
      users.push(this.localPresence);
    }
    
    for (const presence of Array.from(Array.from(this.remotePresences.values()))) {
      if (presence.status === 'active') {
        users.push(presence);
      }
    }
    
    return users;
  }

  // ---------------------------------------------------------------------------
  // Remote Presence Handling
  // ---------------------------------------------------------------------------

  /**
   * Handle incoming presence update from remote user
   */
  handleRemotePresence(presence: UserPresence): void {
    if (presence.userId === this.userId) return; // Ignore self
    
    this.remotePresences.set(presence.userId, presence);
    this.notifyRemoteListeners();
  }

  /**
   * Handle user leaving/disconnecting
   */
  handleUserLeft(userId: string): void {
    const presence = this.remotePresences.get(userId);
    if (presence) {
      presence.status = 'offline';
      this.notifyRemoteListeners();
      
      // Remove after a delay
      setTimeout(() => {
        this.remotePresences.delete(userId);
        this.notifyRemoteListeners();
      }, 5000);
    }
  }

  // ---------------------------------------------------------------------------
  // Heartbeat & Broadcasting
  // ---------------------------------------------------------------------------

  private sendHeartbeat(): void {
    this.localPresence.lastHeartbeat = Date.now();
    this.broadcastLocalPresence();
    
    // Clean stale remote presences
    const staleThreshold = Date.now() - (this.config.heartbeatInterval * 3);
    for (const [userId, presence] of Array.from(this.remotePresences)) {
      if (presence.lastHeartbeat < staleThreshold) {
        presence.status = 'offline';
      }
    }
    this.notifyRemoteListeners();
  }

  private broadcastLocalPresence(): void {
    if (!this.sessionId) return;
    
    // Send to server via API
    fetch('/api/collaboration/presence', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: this.sessionId,
        presence: this.localPresence,
      }),
    }).catch(err => {
      console.warn('Failed to broadcast presence:', err);
    });
  }

  // ---------------------------------------------------------------------------
  // Listeners
  // ---------------------------------------------------------------------------

  onLocalPresenceChange(listener: PresenceListener): () => void {
    this.localListeners.add(listener);
    return () => this.localListeners.delete(listener);
  }

  onRemotePresenceChange(listener: PresenceMapListener): () => void {
    this.remoteListeners.add(listener);
    return () => this.remoteListeners.delete(listener);
  }

  private notifyLocalListeners(): void {
    for (const listener of Array.from(this.localListeners)) {
      listener(this.localPresence);
    }
  }

  private notifyRemoteListeners(): void {
    for (const listener of Array.from(this.remoteListeners)) {
      listener(this.remotePresences);
    }
  }
}

// =============================================================================
// REACT HOOK
// =============================================================================

import { useState, useEffect, useRef, useCallback } from 'react';

export interface UsePresenceOptions {
  userId: string;
  userName: string;
  userColor: string;
  sessionId: string | null;
  config?: Partial<PresenceConfig>;
}

export function usePresence(options: UsePresenceOptions) {
  const { userId, userName, userColor, sessionId, config } = options;
  
  const serviceRef = useRef<PresenceAwarenessService | null>(null);
  const [localPresence, setLocalPresence] = useState<UserPresence | null>(null);
  const [remotePresences, setRemotePresences] = useState<Map<string, UserPresence>>(new Map());

  // Initialize service
  useEffect(() => {
    serviceRef.current = new PresenceAwarenessService(userId, userName, userColor, config);
    
    // Subscribe to updates
    const unsubLocal = serviceRef.current.onLocalPresenceChange(setLocalPresence);
    const unsubRemote = serviceRef.current.onRemotePresenceChange(setRemotePresences);
    
    return () => {
      unsubLocal();
      unsubRemote();
      serviceRef.current?.stop();
    };
  }, [userId, userName, userColor, config]);

  // Start/stop based on sessionId
  useEffect(() => {
    if (sessionId && serviceRef.current) {
      serviceRef.current.start(sessionId);
    }
    
    return () => {
      serviceRef.current?.stop();
    };
  }, [sessionId]);

  // Public methods
  const setFocus = useCallback((elementId?: string, sectionId?: string) => {
    serviceRef.current?.setFocus(elementId, sectionId);
  }, []);

  const handleRemotePresence = useCallback((presence: UserPresence) => {
    serviceRef.current?.handleRemotePresence(presence);
  }, []);

  const handleUserLeft = useCallback((userId: string) => {
    serviceRef.current?.handleUserLeft(userId);
  }, []);

  const getActiveUsers = useCallback(() => {
    return serviceRef.current?.getActiveUsers() || [];
  }, []);

  const getUsersInSection = useCallback((sectionId: string) => {
    return serviceRef.current?.getUsersInSection(sectionId) || [];
  }, []);

  return {
    localPresence,
    remotePresences,
    setFocus,
    handleRemotePresence,
    handleUserLeft,
    getActiveUsers,
    getUsersInSection,
  };
}

export default PresenceAwarenessService;
