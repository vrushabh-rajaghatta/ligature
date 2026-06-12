
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

export interface UserPresence {
  userId: string;
  userName: string;
  status: PresenceStatus;
  lastActivity: number;
  lastHeartbeat: number;
  isTyping: boolean;
  isSelecting: boolean;
  focusedElementId: string | null;
  focusedSectionId: string | null;
  viewportStart: number | null;
  viewportEnd: number | null;
  deviceType: 'desktop' | 'tablet' | 'mobile';
  browserVisible: boolean;
}

export interface PresenceConfig {
  idleTimeout: number;       // ms before idle (default: 60000 = 1 min)
  awayTimeout: number;       // ms before away (default: 300000 = 5 min)
  heartbeatInterval: number; // ms between heartbeats (default: 5000)
  typingTimeout: number;     // ms before typing stops (default: 2000)
}

export interface PresenceUpdate {
  type: 'status_change' | 'activity' | 'focus_change' | 'viewport_change' | 'typing';
  userId: string;
  data: Partial<UserPresence>;
  timestamp: number;
}

type PresenceListener = (presence: UserPresence, update: PresenceUpdate) => void;

// =============================================================================
// DEFAULT CONFIG
// =============================================================================

const DEFAULT_CONFIG: PresenceConfig = {
  idleTimeout: 60000,      // 1 minute
  awayTimeout: 300000,     // 5 minutes
  heartbeatInterval: 5000, // 5 seconds
  typingTimeout: 2000,     // 2 seconds
};

// =============================================================================
// PRESENCE AWARENESS SERVICE
// =============================================================================

export class PresenceAwarenessService {
  private config: PresenceConfig;
  private presence: UserPresence;
  private listeners: Set<PresenceListener> = new Set();
  
  // Timers
  private idleTimer: NodeJS.Timeout | null = null;
  private awayTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private typingTimer: NodeJS.Timeout | null = null;
  
  // Event handlers (bound)
  private handleMouseMove: () => void;
  private handleKeyPress: () => void;
  private handleVisibilityChange: () => void;
  private handleFocus: () => void;
  private handleBlur: () => void;
  private handleScroll: () => void;
  
  constructor(
    userId: string,
    userName: string,
    config: Partial<PresenceConfig> = {}
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    this.presence = {
      userId,
      userName,
      status: 'active',
      lastActivity: Date.now(),
      lastHeartbeat: Date.now(),
      isTyping: false,
      isSelecting: false,
      focusedElementId: null,
      focusedSectionId: null,
      viewportStart: null,
      viewportEnd: null,
      deviceType: this.detectDeviceType(),
      browserVisible: true,
    };
    
    // Bind handlers
    this.handleMouseMove = this.onActivity.bind(this);
    this.handleKeyPress = this.onKeyPress.bind(this);
    this.handleVisibilityChange = this.onVisibilityChange.bind(this);
    this.handleFocus = this.onWindowFocus.bind(this);
    this.handleBlur = this.onWindowBlur.bind(this);
    this.handleScroll = this.onScroll.bind(this);
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  start(): void {
    if (typeof window === 'undefined') return;
    
    // Activity listeners
    window.addEventListener('mousemove', this.handleMouseMove);
    window.addEventListener('keydown', this.handleKeyPress);
    window.addEventListener('click', this.handleMouseMove);
    window.addEventListener('touchstart', this.handleMouseMove);
    window.addEventListener('scroll', this.handleScroll, true);
    
    // Visibility listeners
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    window.addEventListener('focus', this.handleFocus);
    window.addEventListener('blur', this.handleBlur);
    
    // Start timers
    this.resetIdleTimer();
    this.startHeartbeat();
    
    // Emit initial presence
    this.emitUpdate('status_change', { status: 'active' });
  }

  stop(): void {
    if (typeof window === 'undefined') return;
    
    // Remove listeners
    window.removeEventListener('mousemove', this.handleMouseMove);
    window.removeEventListener('keydown', this.handleKeyPress);
    window.removeEventListener('click', this.handleMouseMove);
    window.removeEventListener('touchstart', this.handleMouseMove);
    window.removeEventListener('scroll', this.handleScroll, true);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    window.removeEventListener('focus', this.handleFocus);
    window.removeEventListener('blur', this.handleBlur);
    
    // Clear timers
    if (this.idleTimer) clearTimeout(this.idleTimer);
    if (this.awayTimer) clearTimeout(this.awayTimer);
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    if (this.typingTimer) clearTimeout(this.typingTimer);
    
    // Set offline
    this.updatePresence({ status: 'offline' });
    this.emitUpdate('status_change', { status: 'offline' });
  }

  // ---------------------------------------------------------------------------
  // Event Handlers
  // ---------------------------------------------------------------------------

  private onActivity(): void {
    const wasIdle = this.presence.status !== 'active';
    
    this.updatePresence({
      lastActivity: Date.now(),
      status: 'active',
    });
    
    this.resetIdleTimer();
    
    if (wasIdle) {
      this.emitUpdate('status_change', { status: 'active' });
    }
  }

  private onKeyPress(): void {
    this.onActivity();
    this.setTyping(true);
  }

  private onVisibilityChange(): void {
    const visible = document.visibilityState === 'visible';
    this.updatePresence({ browserVisible: visible });
    
    if (!visible) {
      this.updatePresence({ status: 'away' });
      this.emitUpdate('status_change', { status: 'away', browserVisible: false });
    } else {
      this.onActivity();
    }
  }

  private onWindowFocus(): void {
    this.updatePresence({ browserVisible: true });
    this.onActivity();
  }

  private onWindowBlur(): void {
    // Don't immediately go away, just note the blur
    this.updatePresence({ browserVisible: false });
  }

  private onScroll(): void {
    this.onActivity();
    this.updateViewport();
  }

  // ---------------------------------------------------------------------------
  // Timer Management
  // ---------------------------------------------------------------------------

  private resetIdleTimer(): void {
    if (this.idleTimer) clearTimeout(this.idleTimer);
    if (this.awayTimer) clearTimeout(this.awayTimer);
    
    this.idleTimer = setTimeout(() => {
      this.updatePresence({ status: 'idle' });
      this.emitUpdate('status_change', { status: 'idle' });
      
      // Start away timer
      this.awayTimer = setTimeout(() => {
        this.updatePresence({ status: 'away' });
        this.emitUpdate('status_change', { status: 'away' });
      }, this.config.awayTimeout - this.config.idleTimeout);
      
    }, this.config.idleTimeout);
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      this.updatePresence({ lastHeartbeat: Date.now() });
      this.emitUpdate('activity', { lastHeartbeat: Date.now() });
    }, this.config.heartbeatInterval);
  }

  // ---------------------------------------------------------------------------
  // Public Methods
  // ---------------------------------------------------------------------------

  setTyping(isTyping: boolean): void {
    if (this.typingTimer) clearTimeout(this.typingTimer);
    
    if (isTyping) {
      if (!this.presence.isTyping) {
        this.updatePresence({ isTyping: true });
        this.emitUpdate('typing', { isTyping: true });
      }
      
      // Auto-clear typing after timeout
      this.typingTimer = setTimeout(() => {
        this.updatePresence({ isTyping: false });
        this.emitUpdate('typing', { isTyping: false });
      }, this.config.typingTimeout);
    } else {
      this.updatePresence({ isTyping: false });
      this.emitUpdate('typing', { isTyping: false });
    }
  }

  setSelecting(isSelecting: boolean): void {
    this.updatePresence({ isSelecting });
    this.emitUpdate('activity', { isSelecting });
  }

  setFocusedElement(elementId: string | null, sectionId?: string | null): void {
    this.updatePresence({
      focusedElementId: elementId,
      focusedSectionId: sectionId ?? this.presence.focusedSectionId,
    });
    this.emitUpdate('focus_change', {
      focusedElementId: elementId,
      focusedSectionId: sectionId ?? this.presence.focusedSectionId,
    });
  }

  setFocusedSection(sectionId: string | null): void {
    this.updatePresence({ focusedSectionId: sectionId });
    this.emitUpdate('focus_change', { focusedSectionId: sectionId });
  }

  private updateViewport(): void {
    if (typeof window === 'undefined') return;
    
    const viewportStart = window.scrollY;
    const viewportEnd = window.scrollY + window.innerHeight;
    
    this.updatePresence({ viewportStart, viewportEnd });
    this.emitUpdate('viewport_change', { viewportStart, viewportEnd });
  }

  getPresence(): UserPresence {
    return { ...this.presence };
  }

  // ---------------------------------------------------------------------------
  // Listeners
  // ---------------------------------------------------------------------------

  subscribe(listener: PresenceListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emitUpdate(type: PresenceUpdate['type'], data: Partial<UserPresence>): void {
    const update: PresenceUpdate = {
      type,
      userId: this.presence.userId,
      data,
      timestamp: Date.now(),
    };
    
    this.listeners.forEach(listener => {
      try {
        listener(this.presence, update);
      } catch (e) {
        console.error('Presence listener error:', e);
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private updatePresence(partial: Partial<UserPresence>): void {
    this.presence = { ...this.presence, ...partial };
  }

  private detectDeviceType(): 'desktop' | 'tablet' | 'mobile' {
    if (typeof window === 'undefined') return 'desktop';
    
    const ua = navigator.userAgent;
    if (/tablet|ipad/i.test(ua)) return 'tablet';
    if (/mobile|iphone|android/i.test(ua)) return 'mobile';
    return 'desktop';
  }
}

// =============================================================================
// REACT HOOK
// =============================================================================

import { useState, useEffect, useRef, useCallback } from 'react';

export interface UsePresenceOptions {
  userId: string;
  userName: string;
  config?: Partial<PresenceConfig>;
  onPresenceChange?: (presence: UserPresence, update: PresenceUpdate) => void;
}

export function usePresence(options: UsePresenceOptions) {
  const { userId, userName, config, onPresenceChange } = options;
  
  const serviceRef = useRef<PresenceAwarenessService | null>(null);
  const [presence, setPresence] = useState<UserPresence | null>(null);
  
  useEffect(() => {
    const service = new PresenceAwarenessService(userId, userName, config);
    serviceRef.current = service;
    
    const unsubscribe = service.subscribe((p, update) => {
      setPresence({ ...p });
      onPresenceChange?.(p, update);
    });
    
    service.start();
    setPresence(service.getPresence());
    
    return () => {
      unsubscribe();
      service.stop();
    };
  }, [userId, userName, config, onPresenceChange]);
  
  const setTyping = useCallback((isTyping: boolean) => {
    serviceRef.current?.setTyping(isTyping);
  }, []);
  
  const setSelecting = useCallback((isSelecting: boolean) => {
    serviceRef.current?.setSelecting(isSelecting);
  }, []);
  
  const setFocusedElement = useCallback((elementId: string | null, sectionId?: string | null) => {
    serviceRef.current?.setFocusedElement(elementId, sectionId);
  }, []);
  
  const setFocusedSection = useCallback((sectionId: string | null) => {
    serviceRef.current?.setFocusedSection(sectionId);
  }, []);
  
  return {
    presence,
    setTyping,
    setSelecting,
    setFocusedElement,
    setFocusedSection,
    service: serviceRef.current,
  };
}

export default PresenceAwarenessService;
