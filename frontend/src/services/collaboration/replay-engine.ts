
// =============================================================================
// REPLAY ENGINE SERVICE
// =============================================================================
// Enables playback of operation history with timeline control.
// Supports variable speed playback, seeking, and state reconstruction.
// Part of v0.19.1 - Operation History & Replay
// =============================================================================

import { EventEmitter } from 'events';
import { EditOperationRecord, OperationType } from '@/types/collaboration-persistence';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

/**
 * State of the document at a point in replay
 */
export interface DocumentState {
  /** Current content of the document */
  content: string;
  /** Current version number */
  version: number;
  /** Index of the last applied operation */
  operationIndex: number;
  /** Timestamp of the last applied operation */
  timestamp: Date;
  /** Cursor positions by user */
  cursors: Map<string, number>;
  /** Selections by user */
  selections: Map<string, { start: number; end: number }>;
}

/**
 * Playback state of the replay engine
 */
export type PlaybackState = 'stopped' | 'playing' | 'paused' | 'seeking';

/**
 * Configuration for the replay engine
 */
export interface ReplayConfig {
  /** Initial document content before any operations */
  initialContent: string;
  /** Playback speed multiplier (1 = realtime, 2 = 2x speed) */
  speed: number;
  /** Whether to loop playback */
  loop: boolean;
  /** Whether to preserve timing between operations */
  preserveTiming: boolean;
  /** Minimum delay between operations in ms (when preserveTiming is true) */
  minDelay: number;
  /** Maximum delay between operations in ms (when preserveTiming is true) */
  maxDelay: number;
  /** Fixed delay when preserveTiming is false */
  fixedDelay: number;
}

/**
 * Timeline marker for navigation
 */
export interface TimelineMarker {
  id: string;
  operationIndex: number;
  timestamp: Date;
  label: string;
  type: 'checkpoint' | 'user-join' | 'user-leave' | 'conflict' | 'custom';
  metadata?: Record<string, unknown>;
}

/**
 * Progress information during replay
 */
export interface ReplayProgress {
  /** Current operation index */
  currentIndex: number;
  /** Total number of operations */
  totalOperations: number;
  /** Progress percentage (0-100) */
  percentage: number;
  /** Elapsed time in replay */
  elapsedMs: number;
  /** Estimated total duration */
  totalDurationMs: number;
  /** Current playback state */
  state: PlaybackState;
  /** Current playback speed */
  speed: number;
}

/**
 * Events emitted by the replay engine
 */
export type ReplayEventType =
  | 'replay:started'
  | 'replay:stopped'
  | 'replay:paused'
  | 'replay:resumed'
  | 'replay:completed'
  | 'replay:seeked'
  | 'operation:applied'
  | 'operation:reverted'
  | 'state:changed'
  | 'speed:changed';

export interface ReplayEventData {
  'replay:started': { operationCount: number; speed: number };
  'replay:stopped': { finalIndex: number };
  'replay:paused': { currentIndex: number };
  'replay:resumed': { currentIndex: number };
  'replay:completed': { totalOperations: number; durationMs: number };
  'replay:seeked': { fromIndex: number; toIndex: number };
  'operation:applied': { operation: EditOperationRecord; index: number; state: DocumentState };
  'operation:reverted': { operation: EditOperationRecord; index: number; state: DocumentState };
  'state:changed': { state: DocumentState };
  'speed:changed': { oldSpeed: number; newSpeed: number };
}

/**
 * Interface for replay engine
 */
export interface IReplayEngine {
  // Playback control
  load(operations: EditOperationRecord[]): void;
  play(): void;
  pause(): void;
  stop(): void;
  resume(): void;

  // Navigation
  seekTo(index: number): DocumentState;
  seekToTimestamp(timestamp: Date): DocumentState;
  seekToMarker(markerId: string): DocumentState;
  stepForward(): DocumentState | null;
  stepBackward(): DocumentState | null;

  // State
  getCurrentState(): DocumentState;
  getProgress(): ReplayProgress;
  getPlaybackState(): PlaybackState;

  // Timeline
  addMarker(marker: Omit<TimelineMarker, 'id'>): TimelineMarker;
  getMarkers(): TimelineMarker[];
  removeMarker(markerId: string): boolean;

  // Configuration
  setSpeed(speed: number): void;
  getSpeed(): number;
  getConfig(): ReplayConfig;
  updateConfig(config: Partial<ReplayConfig>): void;

  // Events
  on<E extends ReplayEventType>(event: E, handler: (data: ReplayEventData[E]) => void): void;
  off<E extends ReplayEventType>(event: E, handler: (data: ReplayEventData[E]) => void): void;
}

// -----------------------------------------------------------------------------
// Default Configuration
// -----------------------------------------------------------------------------

export function createDefaultReplayConfig(): ReplayConfig {
  return {
    initialContent: '',
    speed: 1,
    loop: false,
    preserveTiming: true,
    minDelay: 50,
    maxDelay: 2000,
    fixedDelay: 100,
  };
}

// -----------------------------------------------------------------------------
// Replay Engine Service
// -----------------------------------------------------------------------------

export class ReplayEngineService implements IReplayEngine {
  private operations: EditOperationRecord[] = [];
  private config: ReplayConfig;
  private emitter: EventEmitter;
  private state: PlaybackState = 'stopped';
  private currentIndex: number = -1;
  private documentState: DocumentState;
  private markers: Map<string, TimelineMarker> = new Map();
  private playbackTimer: ReturnType<typeof setTimeout> | null = null;
  private startTime: number = 0;

  constructor(config?: Partial<ReplayConfig>) {
    this.config = {
      ...createDefaultReplayConfig(),
      ...config,
    };
    this.emitter = new EventEmitter();
    this.documentState = this.createInitialState();
  }

  // ---------------------------------------------------------------------------
  // Playback Control
  // ---------------------------------------------------------------------------

  load(operations: EditOperationRecord[]): void {
    this.stop();
    this.operations = [...operations].sort(
      (a, b) => a.sequenceNumber - b.sequenceNumber
    );
    this.currentIndex = -1;
    this.documentState = this.createInitialState();
    this.markers.clear();

    // Auto-generate markers for notable events
    this.generateDefaultMarkers();
  }

  play(): void {
    if (this.operations.length === 0) {
      return;
    }

    if (this.state === 'paused') {
      this.resume();
      return;
    }

    this.state = 'playing';
    this.startTime = Date.now();

    this.emit('replay:started', {
      operationCount: this.operations.length,
      speed: this.config.speed,
    });

    this.scheduleNextOperation();
  }

  pause(): void {
    if (this.state !== 'playing') {
      return;
    }

    this.state = 'paused';
    this.clearTimer();

    this.emit('replay:paused', { currentIndex: this.currentIndex });
  }

  stop(): void {
    this.clearTimer();
    const finalIndex = this.currentIndex;
    this.state = 'stopped';
    this.currentIndex = -1;
    this.documentState = this.createInitialState();

    this.emit('replay:stopped', { finalIndex });
  }

  resume(): void {
    if (this.state !== 'paused') {
      return;
    }

    this.state = 'playing';

    this.emit('replay:resumed', { currentIndex: this.currentIndex });

    this.scheduleNextOperation();
  }

  // ---------------------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------------------

  seekTo(index: number): DocumentState {
    const targetIndex = Math.max(-1, Math.min(index, this.operations.length - 1));
    const fromIndex = this.currentIndex;

    this.state = 'seeking';

    if (targetIndex > this.currentIndex) {
      // Move forward
      while (this.currentIndex < targetIndex) {
        this.applyNextOperation();
      }
    } else if (targetIndex < this.currentIndex) {
      // Move backward - rebuild from scratch
      this.documentState = this.createInitialState();
      this.currentIndex = -1;
      while (this.currentIndex < targetIndex) {
        this.applyNextOperation();
      }
    }

    this.state = 'stopped';

    this.emit('replay:seeked', {
      fromIndex,
      toIndex: this.currentIndex,
    });

    return { ...this.documentState };
  }

  seekToTimestamp(timestamp: Date): DocumentState {
    const targetTime = timestamp.getTime();

    // Find the operation closest to the timestamp
    let targetIndex = -1;
    for (let i = 0; i < this.operations.length; i++) {
      if (this.operations[i].serverTimestamp.getTime() <= targetTime) {
        targetIndex = i;
      } else {
        break;
      }
    }

    return this.seekTo(targetIndex);
  }

  seekToMarker(markerId: string): DocumentState {
    const marker = this.markers.get(markerId);
    if (!marker) {
      return { ...this.documentState };
    }

    return this.seekTo(marker.operationIndex);
  }

  stepForward(): DocumentState | null {
    if (this.currentIndex >= this.operations.length - 1) {
      return null;
    }

    this.applyNextOperation();
    return { ...this.documentState };
  }

  stepBackward(): DocumentState | null {
    if (this.currentIndex < 0) {
      return null;
    }

    // Rebuild from scratch up to previous index
    const targetIndex = this.currentIndex - 1;
    this.documentState = this.createInitialState();
    this.currentIndex = -1;

    while (this.currentIndex < targetIndex) {
      this.applyNextOperation();
    }

    return { ...this.documentState };
  }

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------

  getCurrentState(): DocumentState {
    return { ...this.documentState };
  }

  getProgress(): ReplayProgress {
    const totalOperations = this.operations.length;
    const currentIndex = Math.max(0, this.currentIndex);
    const percentage = totalOperations > 0
      ? (currentIndex / totalOperations) * 100
      : 0;

    const elapsedMs = this.state === 'stopped' ? 0 : Date.now() - this.startTime;
    const totalDurationMs = this.calculateTotalDuration();

    return {
      currentIndex: this.currentIndex,
      totalOperations,
      percentage,
      elapsedMs,
      totalDurationMs,
      state: this.state,
      speed: this.config.speed,
    };
  }

  getPlaybackState(): PlaybackState {
    return this.state;
  }

  // ---------------------------------------------------------------------------
  // Timeline
  // ---------------------------------------------------------------------------

  addMarker(marker: Omit<TimelineMarker, 'id'>): TimelineMarker {
    const fullMarker: TimelineMarker = {
      ...marker,
      id: `marker-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    };

    this.markers.set(fullMarker.id, fullMarker);
    return fullMarker;
  }

  getMarkers(): TimelineMarker[] {
    return Array.from(this.markers.values()).sort(
      (a, b) => a.operationIndex - b.operationIndex
    );
  }

  removeMarker(markerId: string): boolean {
    return this.markers.delete(markerId);
  }

  // ---------------------------------------------------------------------------
  // Configuration
  // ---------------------------------------------------------------------------

  setSpeed(speed: number): void {
    if (speed <= 0) {
      throw new Error('Speed must be positive');
    }

    const oldSpeed = this.config.speed;
    this.config.speed = speed;

    this.emit('speed:changed', { oldSpeed, newSpeed: speed });
  }

  getSpeed(): number {
    return this.config.speed;
  }

  getConfig(): ReplayConfig {
    return { ...this.config };
  }

  updateConfig(config: Partial<ReplayConfig>): void {
    this.config = {
      ...this.config,
      ...config,
    };
  }

  // ---------------------------------------------------------------------------
  // Events
  // ---------------------------------------------------------------------------

  on<E extends ReplayEventType>(
    event: E,
    handler: (data: ReplayEventData[E]) => void
  ): void {
    this.emitter.on(event, handler);
  }

  off<E extends ReplayEventType>(
    event: E,
    handler: (data: ReplayEventData[E]) => void
  ): void {
    this.emitter.off(event, handler);
  }

  private emit<E extends ReplayEventType>(
    event: E,
    data: ReplayEventData[E]
  ): void {
    this.emitter.emit(event, data);
  }

  // ---------------------------------------------------------------------------
  // Private Helpers
  // ---------------------------------------------------------------------------

  private createInitialState(): DocumentState {
    return {
      content: this.config.initialContent,
      version: 0,
      operationIndex: -1,
      timestamp: new Date(),
      cursors: new Map(),
      selections: new Map(),
    };
  }

  private applyNextOperation(): void {
    if (this.currentIndex >= this.operations.length - 1) {
      return;
    }

    this.currentIndex++;
    const operation = this.operations[this.currentIndex];

    // Apply operation to document state
    this.applyOperation(operation);

    this.emit('operation:applied', {
      operation,
      index: this.currentIndex,
      state: { ...this.documentState },
    });

    this.emit('state:changed', { state: { ...this.documentState } });
  }

  private applyOperation(operation: EditOperationRecord): void {
    const { content } = this.documentState;

    switch (operation.operationType) {
      case 'INSERT':
        this.documentState.content =
          content.slice(0, operation.position) +
          (operation.content || '') +
          content.slice(operation.position);
        break;

      case 'DELETE':
        this.documentState.content =
          content.slice(0, operation.position) +
          content.slice(operation.position + (operation.length || 0));
        break;

      case 'REPLACE':
        this.documentState.content =
          content.slice(0, operation.position) +
          (operation.content || '') +
          content.slice(operation.position + (operation.length || 0));
        break;

      // FORMAT and MOVE don't change content text
      case 'FORMAT':
      case 'MOVE':
      case 'COMPOUND':
        // These would affect metadata, not handled in simple replay
        break;
    }

    this.documentState.version = operation.resultVersion;
    this.documentState.operationIndex = this.currentIndex;
    this.documentState.timestamp = operation.serverTimestamp;

    // Update cursor for the user who made the operation
    if (operation.operationType === 'INSERT') {
      this.documentState.cursors.set(
        operation.userId,
        operation.position + (operation.content?.length || 0)
      );
    } else {
      this.documentState.cursors.set(operation.userId, operation.position);
    }
  }

  private scheduleNextOperation(): void {
    if (this.state !== 'playing') {
      return;
    }

    if (this.currentIndex >= this.operations.length - 1) {
      // Replay completed
      this.state = 'stopped';
      this.emit('replay:completed', {
        totalOperations: this.operations.length,
        durationMs: Date.now() - this.startTime,
      });

      if (this.config.loop) {
        this.currentIndex = -1;
        this.documentState = this.createInitialState();
        this.play();
      }
      return;
    }

    const delay = this.calculateDelay();

    this.playbackTimer = setTimeout(() => {
      this.applyNextOperation();
      this.scheduleNextOperation();
    }, delay);
  }

  private calculateDelay(): number {
    if (!this.config.preserveTiming) {
      return this.config.fixedDelay / this.config.speed;
    }

    // Calculate delay based on timestamp difference
    const currentOp = this.operations[this.currentIndex];
    const nextOp = this.operations[this.currentIndex + 1];

    if (!currentOp || !nextOp) {
      return this.config.fixedDelay / this.config.speed;
    }

    const timeDiff =
      nextOp.serverTimestamp.getTime() - currentOp.serverTimestamp.getTime();

    // Clamp to min/max and apply speed
    const clampedDelay = Math.max(
      this.config.minDelay,
      Math.min(this.config.maxDelay, timeDiff)
    );

    return clampedDelay / this.config.speed;
  }

  private calculateTotalDuration(): number {
    if (this.operations.length < 2) {
      return 0;
    }

    if (!this.config.preserveTiming) {
      return (this.operations.length * this.config.fixedDelay) / this.config.speed;
    }

    const first = this.operations[0].serverTimestamp.getTime();
    const last = this.operations[this.operations.length - 1].serverTimestamp.getTime();

    return (last - first) / this.config.speed;
  }

  private clearTimer(): void {
    if (this.playbackTimer) {
      clearTimeout(this.playbackTimer);
      this.playbackTimer = null;
    }
  }

  private generateDefaultMarkers(): void {
    const userSessions = new Map<string, { firstIndex: number; lastIndex: number }>();

    // Track user join/leave points
    for (let i = 0; i < this.operations.length; i++) {
      const op = this.operations[i];
      const session = userSessions.get(op.userId);

      if (!session) {
        userSessions.set(op.userId, { firstIndex: i, lastIndex: i });

        // Add user join marker
        this.addMarker({
          operationIndex: i,
          timestamp: op.serverTimestamp,
          label: `${op.userName || op.userId} joined`,
          type: 'user-join',
          metadata: { userId: op.userId },
        });
      } else {
        session.lastIndex = i;
      }
    }

    // Add user leave markers
    for (const [userId, session] of Array.from(userSessions)) {
      const op = this.operations[session.lastIndex];
      if (session.lastIndex < this.operations.length - 1) {
        this.addMarker({
          operationIndex: session.lastIndex,
          timestamp: op.serverTimestamp,
          label: `${op.userName || userId} left`,
          type: 'user-leave',
          metadata: { userId },
        });
      }
    }

    // Add conflict markers
    for (let i = 0; i < this.operations.length; i++) {
      const op = this.operations[i];
      if (op.hadConflict) {
        this.addMarker({
          operationIndex: i,
          timestamp: op.serverTimestamp,
          label: 'Conflict resolved',
          type: 'conflict',
          metadata: { resolution: op.conflictResolution },
        });
      }
    }
  }
}

// -----------------------------------------------------------------------------
// Factory Function
// -----------------------------------------------------------------------------

export function createReplayEngine(
  config?: Partial<ReplayConfig>
): ReplayEngineService {
  return new ReplayEngineService(config);
}

// -----------------------------------------------------------------------------
// Utility Functions
// -----------------------------------------------------------------------------

/**
 * Calculate the final document state by replaying all operations
 */
export function calculateFinalState(
  operations: EditOperationRecord[],
  initialContent: string = ''
): DocumentState {
  const engine = createReplayEngine({ initialContent });
  engine.load(operations);
  engine.seekTo(operations.length - 1);
  return engine.getCurrentState();
}

/**
 * Get document state at a specific version
 */
export function getStateAtVersion(
  operations: EditOperationRecord[],
  version: number,
  initialContent: string = ''
): DocumentState | null {
  const targetOp = operations.find((op) => op.resultVersion === version);
  if (!targetOp) {
    return null;
  }

  const index = operations.indexOf(targetOp);
  const engine = createReplayEngine({ initialContent });
  engine.load(operations);
  engine.seekTo(index);
  return engine.getCurrentState();
}

/**
 * Extract content changes between two versions
 */
export function getContentDiff(
  operations: EditOperationRecord[],
  fromVersion: number,
  toVersion: number,
  initialContent: string = ''
): { from: string; to: string } | null {
  const fromState = getStateAtVersion(operations, fromVersion, initialContent);
  const toState = getStateAtVersion(operations, toVersion, initialContent);

  if (!fromState || !toState) {
    return null;
  }

  return {
    from: fromState.content,
    to: toState.content,
  };
}
