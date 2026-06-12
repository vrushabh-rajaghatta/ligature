
/**
 * Session Manager
 * ===============
 * Enhanced session management with:
 * - Token refresh mechanisms
 * - Concurrent session handling
 * - Session revocation/logout propagation
 * - Activity tracking
 * 
 * @version 0.15.5
 */

import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import { JWT_CONFIG, SESSION_CONFIG } from '@/config/auth-config';

// =============================================================================
// TYPES
// =============================================================================

export interface SessionPayload extends JWTPayload {
  /** User ID */
  sub: string;
  /** User email */
  email: string;
  /** User role */
  role: string;
  /** User display name */
  name: string;
  /** Organization ID (for multi-tenancy) */
  orgId?: string;
  /** Session ID for tracking/revocation */
  sid: string;
  /** Token version for refresh tracking */
  tokenVersion?: number;
}

export interface SessionInfo {
  sessionId: string;
  userId: string;
  email: string;
  name: string;
  role: string;
  organizationId?: string;
  createdAt: Date;
  lastActivityAt: Date;
  expiresAt: Date;
  userAgent?: string;
  ipAddress?: string;
  isActive: boolean;
  tokenVersion: number;
}

export interface SessionCreateOptions {
  userId: string;
  email: string;
  name: string;
  role: string;
  organizationId?: string;
  userAgent?: string;
  ipAddress?: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  sessionId: string;
}

export interface RefreshResult {
  success: boolean;
  tokenPair?: TokenPair;
  error?: string;
  shouldLogout?: boolean;
}

export type SessionEventType = 
  | 'created'
  | 'refreshed'
  | 'activity'
  | 'expired'
  | 'revoked'
  | 'logout'
  | 'concurrent-limit';

export interface SessionEvent {
  type: SessionEventType;
  sessionId: string;
  userId: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

// =============================================================================
// SESSION STORE (In-Memory for now, can be replaced with Redis)
// =============================================================================

class SessionStore {
  private sessions: Map<string, SessionInfo> = new Map();
  private userSessions: Map<string, Set<string>> = new Map();
  private revokedTokens: Set<string> = new Set();
  private events: SessionEvent[] = [];
  private readonly maxEvents = 1000;

  /**
   * Add a session
   */
  add(session: SessionInfo): void {
    this.sessions.set(session.sessionId, session);
    
    // Track by user
    if (!this.userSessions.has(session.userId)) {
      this.userSessions.set(session.userId, new Set());
    }
    this.userSessions.get(session.userId)!.add(session.sessionId);
    
    this.logEvent('created', session.sessionId, session.userId);
  }

  /**
   * Get a session by ID
   */
  get(sessionId: string): SessionInfo | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Update session activity
   */
  updateActivity(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastActivityAt = new Date();
      this.logEvent('activity', sessionId, session.userId);
    }
  }

  /**
   * Update token version after refresh
   */
  updateTokenVersion(sessionId: string, newVersion: number): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.tokenVersion = newVersion;
      this.logEvent('refreshed', sessionId, session.userId);
    }
  }

  /**
   * Get all sessions for a user
   */
  getUserSessions(userId: string): SessionInfo[] {
    const sessionIds = this.userSessions.get(userId);
    if (!sessionIds) return [];
    
    return Array.from(sessionIds)
      .map(id => this.sessions.get(id))
      .filter((s): s is SessionInfo => s !== undefined && s.isActive);
  }

  /**
   * Count active sessions for a user
   */
  countUserSessions(userId: string): number {
    return this.getUserSessions(userId).length;
  }

  /**
   * Revoke a session
   */
  revoke(sessionId: string, reason: SessionEventType = 'revoked'): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.isActive = false;
      this.revokedTokens.add(sessionId);
      this.logEvent(reason, sessionId, session.userId);
    }
  }

  /**
   * Revoke all sessions for a user
   */
  revokeAllUserSessions(userId: string, exceptSessionId?: string): number {
    const sessionIds = this.userSessions.get(userId);
    if (!sessionIds) return 0;
    
    let count = 0;
    for (const sessionId of Array.from(sessionIds)) {
      if (sessionId !== exceptSessionId) {
        this.revoke(sessionId, 'logout');
        count++;
      }
    }
    return count;
  }

  /**
   * Revoke oldest session for a user (for concurrent limit)
   */
  revokeOldestSession(userId: string): string | null {
    const sessions = this.getUserSessions(userId);
    if (sessions.length === 0) return null;
    
    // Sort by creation time, oldest first
    sessions.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    const oldest = sessions[0];
    
    this.revoke(oldest.sessionId, 'concurrent-limit');
    return oldest.sessionId;
  }

  /**
   * Check if a session is revoked
   */
  isRevoked(sessionId: string): boolean {
    return this.revokedTokens.has(sessionId);
  }

  /**
   * Clean up expired sessions
   */
  cleanup(): number {
    const now = new Date();
    let cleaned = 0;
    
    for (const [sessionId, session] of Array.from(this.sessions)) {
      if (session.expiresAt < now || !session.isActive) {
        this.sessions.delete(sessionId);
        this.userSessions.get(session.userId)?.delete(sessionId);
        cleaned++;
      }
    }
    
    return cleaned;
  }

  /**
   * Log a session event
   */
  private logEvent(
    type: SessionEventType,
    sessionId: string,
    userId: string,
    metadata?: Record<string, unknown>
  ): void {
    this.events.push({
      type,
      sessionId,
      userId,
      timestamp: new Date(),
      metadata,
    });
    
    // Trim events if too many
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }
  }

  /**
   * Get recent events
   */
  getEvents(limit = 100): SessionEvent[] {
    return this.events.slice(-limit);
  }

  /**
   * Get events for a user
   */
  getUserEvents(userId: string, limit = 50): SessionEvent[] {
    return this.events
      .filter(e => e.userId === userId)
      .slice(-limit);
  }

  /**
   * Clear all data (for testing)
   */
  clear(): void {
    this.sessions.clear();
    this.userSessions.clear();
    this.revokedTokens.clear();
    this.events = [];
  }

  /**
   * Get stats
   */
  getStats(): {
    totalSessions: number;
    activeSessions: number;
    revokedTokens: number;
    totalEvents: number;
  } {
    let activeSessions = 0;
    for (const session of Array.from(Array.from(this.sessions.values()))) {
      if (session.isActive) activeSessions++;
    }
    
    return {
      totalSessions: this.sessions.size,
      activeSessions,
      revokedTokens: this.revokedTokens.size,
      totalEvents: this.events.length,
    };
  }
}

// Singleton store instance
const sessionStore = new SessionStore();

// =============================================================================
// SESSION MANAGER
// =============================================================================

/**
 * Get the JWT secret key
 */
function getSecretKey(): Uint8Array {
  return new TextEncoder().encode(JWT_CONFIG.secret);
}

/**
 * Generate a unique session ID
 */
function generateSessionId(): string {
  return `sess_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * Create a new session with tokens
 */
export async function createSession(options: SessionCreateOptions): Promise<TokenPair> {
  const { userId, email, name, role, organizationId, userAgent, ipAddress } = options;
  
  // Check concurrent session limit
  const currentCount = sessionStore.countUserSessions(userId);
  if (currentCount >= SESSION_CONFIG.maxConcurrentSessions) {
    // Revoke oldest session to make room
    sessionStore.revokeOldestSession(userId);
  }
  
  const sessionId = generateSessionId();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_CONFIG.maxSessionHours * 60 * 60 * 1000);
  const tokenVersion = 1;
  
  // Create session info
  const sessionInfo: SessionInfo = {
    sessionId,
    userId,
    email,
    name,
    role,
    organizationId,
    createdAt: now,
    lastActivityAt: now,
    expiresAt,
    userAgent,
    ipAddress,
    isActive: true,
    tokenVersion,
  };
  
  // Store session
  sessionStore.add(sessionInfo);
  
  // Create access token
  const accessToken = await createAccessToken({
    sub: userId,
    email,
    name,
    role,
    orgId: organizationId,
    sid: sessionId,
    tokenVersion,
  });
  
  // Create refresh token (longer lived)
  const refreshToken = await createRefreshToken(sessionId, userId, tokenVersion);
  
  return {
    accessToken,
    refreshToken,
    expiresAt,
    sessionId,
  };
}

/**
 * Create an access token (short-lived)
 */
async function createAccessToken(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setIssuer(JWT_CONFIG.issuer)
    .setAudience(JWT_CONFIG.audience)
    .setExpirationTime('15m') // Short-lived access token
    .sign(getSecretKey());
}

/**
 * Create a refresh token (longer-lived)
 */
async function createRefreshToken(
  sessionId: string,
  userId: string,
  tokenVersion: number
): Promise<string> {
  return new SignJWT({
    sub: userId,
    sid: sessionId,
    type: 'refresh',
    tokenVersion,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setIssuer(JWT_CONFIG.issuer)
    .setAudience(JWT_CONFIG.audience)
    .setExpirationTime(JWT_CONFIG.expiresIn) // Same as session max
    .sign(getSecretKey());
}

/**
 * Verify an access token
 */
export async function verifyAccessToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey(), {
      issuer: JWT_CONFIG.issuer,
      audience: JWT_CONFIG.audience,
    });
    
    const sessionPayload = payload as SessionPayload;
    
    // Check if session is revoked
    if (sessionStore.isRevoked(sessionPayload.sid)) {
      return null;
    }
    
    // Update activity
    sessionStore.updateActivity(sessionPayload.sid);
    
    return sessionPayload;
  } catch {
    return null;
  }
}

/**
 * Refresh tokens using refresh token
 */
export async function refreshTokens(refreshToken: string): Promise<RefreshResult> {
  try {
    const { payload } = await jwtVerify(refreshToken, getSecretKey(), {
      issuer: JWT_CONFIG.issuer,
      audience: JWT_CONFIG.audience,
    });
    
    // Validate refresh token type
    if ((payload as { type?: string }).type !== 'refresh') {
      return { success: false, error: 'Invalid token type' };
    }
    
    const sessionId = (payload as { sid: string }).sid;
    const tokenVersion = (payload as { tokenVersion: number }).tokenVersion;
    
    // Check if session exists and is active
    const session = sessionStore.get(sessionId);
    if (!session) {
      return { success: false, error: 'Session not found', shouldLogout: true };
    }
    
    if (!session.isActive) {
      return { success: false, error: 'Session revoked', shouldLogout: true };
    }
    
    // Check token version (detect reuse of old refresh tokens)
    if (session.tokenVersion !== tokenVersion) {
      // Possible token reuse attack - revoke all sessions for this user
      sessionStore.revokeAllUserSessions(session.userId);
      return { 
        success: false, 
        error: 'Token version mismatch - all sessions revoked',
        shouldLogout: true,
      };
    }
    
    // Check session expiry
    if (session.expiresAt < new Date()) {
      sessionStore.revoke(sessionId, 'expired');
      return { success: false, error: 'Session expired', shouldLogout: true };
    }
    
    // Check inactivity timeout
    const inactivityMs = SESSION_CONFIG.inactivityTimeoutMinutes * 60 * 1000;
    if (Date.now() - session.lastActivityAt.getTime() > inactivityMs) {
      sessionStore.revoke(sessionId, 'expired');
      return { success: false, error: 'Session inactive', shouldLogout: true };
    }
    
    // Increment token version
    const newTokenVersion = tokenVersion + 1;
    sessionStore.updateTokenVersion(sessionId, newTokenVersion);
    
    // Create new tokens
    const accessToken = await createAccessToken({
      sub: session.userId,
      email: session.email,
      name: session.name,
      role: session.role,
      orgId: session.organizationId,
      sid: sessionId,
      tokenVersion: newTokenVersion,
    });
    
    const newRefreshToken = await createRefreshToken(
      sessionId,
      session.userId,
      newTokenVersion
    );
    
    return {
      success: true,
      tokenPair: {
        accessToken,
        refreshToken: newRefreshToken,
        expiresAt: session.expiresAt,
        sessionId,
      },
    };
  } catch {
    return { success: false, error: 'Invalid refresh token', shouldLogout: true };
  }
}

/**
 * Logout - revoke current session
 */
export function logout(sessionId: string): void {
  sessionStore.revoke(sessionId, 'logout');
}

/**
 * Logout from all devices
 */
export function logoutAll(userId: string, exceptSessionId?: string): number {
  return sessionStore.revokeAllUserSessions(userId, exceptSessionId);
}

/**
 * Get session info
 */
export function getSessionInfo(sessionId: string): SessionInfo | undefined {
  return sessionStore.get(sessionId);
}

/**
 * Get all sessions for a user
 */
export function getUserSessions(userId: string): SessionInfo[] {
  return sessionStore.getUserSessions(userId);
}

/**
 * Get session events for a user
 */
export function getSessionEvents(userId: string, limit?: number): SessionEvent[] {
  return sessionStore.getUserEvents(userId, limit);
}

/**
 * Clean up expired sessions
 */
export function cleanupSessions(): number {
  return sessionStore.cleanup();
}

/**
 * Get session stats
 */
export function getSessionStats() {
  return sessionStore.getStats();
}

/**
 * Clear all sessions (for testing)
 */
export function clearAllSessions(): void {
  sessionStore.clear();
}

// =============================================================================
// EXPORTS
// =============================================================================

export const SessionManager = {
  createSession,
  verifyAccessToken,
  refreshTokens,
  logout,
  logoutAll,
  getSessionInfo,
  getUserSessions,
  getSessionEvents,
  cleanupSessions,
  getSessionStats,
  clearAllSessions,
};
