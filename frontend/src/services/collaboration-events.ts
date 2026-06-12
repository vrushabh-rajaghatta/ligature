
/**
 * Collaboration Events Service
 * Shared service for collaboration event management
 * 
 * v0.42.10 - Extract from route to fix import issues
 */

// =============================================================================
// TYPES
// =============================================================================

export interface CollaborationEvent {
  type: 'participant_joined' | 'participant_left' | 'cursor_update' | 'selection_update' | 
        'content_change' | 'heartbeat' | 'session_closed' | 'error';
  data: unknown;
  timestamp: string;
  senderId?: string;
}

// =============================================================================
// IN-MEMORY EVENT STORE
// =============================================================================

// Map of sessionId -> array of pending events
export const sessionEvents = new Map<string, CollaborationEvent[]>();
// Map of sessionId -> Set of active connections (response objects)
export const sessionConnections = new Map<string, Set<ReadableStreamDefaultController>>();
// Map of sessionId -> last activity timestamp
export const sessionActivity = new Map<string, number>();

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

export function broadcastToSession(sessionId: string, event: CollaborationEvent, excludeController?: ReadableStreamDefaultController) {
  const connections = sessionConnections.get(sessionId);
  if (!connections) return;
  
  const message = `data: ${JSON.stringify(event)}\n\n`;
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  
  for (const controller of Array.from(connections)) {
    if (controller !== excludeController) {
      try {
        controller.enqueue(data);
      } catch (error) {
        // Connection closed, remove from set
        connections.delete(controller);
      }
    }
  }
  
  // Update activity
  sessionActivity.set(sessionId, Date.now());
}

export function emitCollaborationEvent(sessionId: string, event: CollaborationEvent) {
  // Store event
  if (!sessionEvents.has(sessionId)) {
    sessionEvents.set(sessionId, []);
  }
  const events = sessionEvents.get(sessionId)!;
  events.push(event);
  
  // Keep only last 100 events per session
  if (events.length > 100) {
    events.shift();
  }
  
  // Broadcast to all connected clients
  broadcastToSession(sessionId, event);
}

// Cleanup stale sessions - call this periodically
export function cleanupStaleSessions() {
  const staleThreshold = Date.now() - 10 * 60 * 1000; // 10 minutes
  for (const [sessionId, lastActivity] of Array.from(Array.from(Array.from(Array.from(sessionActivity.entries()))))) {
    if (lastActivity < staleThreshold) {
      sessionEvents.delete(sessionId);
      sessionConnections.delete(sessionId);
      sessionActivity.delete(sessionId);
    }
  }
}

// Start cleanup interval
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupStaleSessions, 5 * 60 * 1000);
}
