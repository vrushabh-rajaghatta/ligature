// =============================================================================
// SESSION INDICATOR COMPONENT
// =============================================================================
// Displays collaborative session status, connection state, and activity
// Part of v0.18.9 - Collaboration UI Components
// =============================================================================


import { useState, useEffect, useMemo } from 'react';
import { 
  CollaborativeSession, 
  SessionStatus,
  SessionParticipant,
  SessionManagerStats,
} from '@/services/collaboration/session-manager';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface SessionIndicatorProps {
  session: CollaborativeSession | null;
  isConnected: boolean;
  isConnecting?: boolean;
  error?: string | null;
  stats?: SessionManagerStats;
  showDetails?: boolean;
  variant?: 'compact' | 'default' | 'expanded';
  onReconnect?: () => void;
  onLeave?: () => void;
  onViewParticipants?: () => void;
  className?: string;
}

export interface ConnectionStatusProps {
  isConnected: boolean;
  isConnecting?: boolean;
  error?: string | null;
  onReconnect?: () => void;
}

export interface SessionStatsDisplayProps {
  stats: SessionManagerStats;
  className?: string;
}

export interface ActivityPulseProps {
  isActive: boolean;
  color?: string;
}

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const SESSION_STATUS_CONFIG: Record<SessionStatus, { 
  label: string; 
  color: string; 
  bgColor: string; 
}> = {
  active: {
    label: 'Active Session',
    color: 'text-green-400',
    bgColor: 'bg-green-500/20',
  },
  paused: {
    label: 'Session Paused',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/20',
  },
  closed: {
    label: 'Session Ended',
    color: 'text-slate-400',
    bgColor: 'bg-slate-500/20',
  },
};

// -----------------------------------------------------------------------------
// Activity Pulse Component
// -----------------------------------------------------------------------------

export function ActivityPulse({ isActive, color = '#10B981' }: ActivityPulseProps) {
  return (
    <span className="relative flex h-2.5 w-2.5">
      {isActive && (
        <span
          className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
          style={{ backgroundColor: color }}
        />
      )}
      <span
        className="relative inline-flex rounded-full h-2.5 w-2.5"
        style={{ backgroundColor: color }}
      />
    </span>
  );
}

// -----------------------------------------------------------------------------
// Connection Status Component
// -----------------------------------------------------------------------------

export function ConnectionStatus({
  isConnected,
  isConnecting,
  error,
  onReconnect,
}: ConnectionStatusProps) {
  const statusConfig = useMemo(() => {
    if (error) {
      return {
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
            />
          </svg>
        ),
        color: 'text-red-400',
        bgColor: 'bg-red-500/20',
        label: 'Connection Error',
      };
    }
    if (isConnecting) {
      return {
        icon: (
          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" 
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" 
            />
          </svg>
        ),
        color: 'text-amber-400',
        bgColor: 'bg-amber-500/20',
        label: 'Connecting...',
      };
    }
    if (isConnected) {
      return {
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M5 13l4 4L19 7" 
            />
          </svg>
        ),
        color: 'text-green-400',
        bgColor: 'bg-green-500/20',
        label: 'Connected',
      };
    }
    return {
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
            d="M18.364 5.636a9 9 0 010 12.728M5.636 5.636a9 9 0 000 12.728" 
          />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
            d="M8.464 8.464a5 5 0 000 7.072M15.536 8.464a5 5 0 010 7.072" 
          />
        </svg>
      ),
      color: 'text-slate-400',
      bgColor: 'bg-slate-500/20',
      label: 'Disconnected',
    };
  }, [isConnected, isConnecting, error]);

  return (
    <div className="flex items-center gap-2">
      <div className={`p-1 rounded ${statusConfig.bgColor} ${statusConfig?.color ?? ''}`}>
        {statusConfig.icon}
      </div>
      <span className={`text-sm ${statusConfig?.color ?? ''}`}>
        {statusConfig.label}
      </span>
      {error && onReconnect && (
        <button
          onClick={onReconnect}
          className="text-xs text-accent-blue hover:text-accent-blue/80 underline"
        >
          Retry
        </button>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Session Stats Display Component
// -----------------------------------------------------------------------------

export function SessionStatsDisplay({ stats, className = '' }: SessionStatsDisplayProps) {
  return (
    <div className={`grid grid-cols-2 gap-3 ${className}`}>
      <div className="bg-slate-800/50 rounded-lg px-3 py-2">
        <div className="text-xs text-slate-400">Active Sessions</div>
        <div className="text-lg font-semibold text-white">{stats.activeSessions}</div>
      </div>
      <div className="bg-slate-800/50 rounded-lg px-3 py-2">
        <div className="text-xs text-slate-400">Participants</div>
        <div className="text-lg font-semibold text-white">{stats.totalParticipants}</div>
      </div>
      <div className="bg-slate-800/50 rounded-lg px-3 py-2">
        <div className="text-xs text-slate-400">Edits Processed</div>
        <div className="text-lg font-semibold text-white">{stats.editsProcessed}</div>
      </div>
      <div className="bg-slate-800/50 rounded-lg px-3 py-2">
        <div className="text-xs text-slate-400">Conflicts Resolved</div>
        <div className="text-lg font-semibold text-white">{stats.conflictsResolved}</div>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Participant Count Badge Component
// -----------------------------------------------------------------------------

interface ParticipantCountBadgeProps {
  participants: SessionParticipant[];
  onClick?: () => void;
}

function ParticipantCountBadge({ participants, onClick }: ParticipantCountBadgeProps) {
  const activeCount = participants.filter(p => p.presence.status === 'active').length;

  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-1.5 px-2 py-1 rounded-full
        bg-slate-800 hover:bg-slate-700 transition-colors
        text-xs font-medium
        ${onClick ? 'cursor-pointer' : ''}
      `}
    >
      <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
          d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m9 5.197v1" 
        />
      </svg>
      <span className="text-white">{activeCount}</span>
      <span className="text-slate-400">/ {participants.length}</span>
    </button>
  );
}

// -----------------------------------------------------------------------------
// Compact Session Indicator
// -----------------------------------------------------------------------------

interface CompactIndicatorProps {
  session: CollaborativeSession;
  isConnected: boolean;
  onViewParticipants?: () => void;
}

function CompactIndicator({ session, isConnected, onViewParticipants }: CompactIndicatorProps) {
  const activeParticipants = session.participants.filter(p => p.presence.status === 'active');

  return (
    <div className="flex items-center gap-3">
      <ActivityPulse isActive={isConnected && session.status === 'active'} />
      
      <div className="flex items-center gap-2">
        {/* Participant avatars (first 3) */}
        <div className="flex -space-x-2">
          {activeParticipants.slice(0, 3).map(p => (
            <div
              key={p.userId}
              className="w-6 h-6 rounded-full ring-2 ring-slate-900 flex items-center justify-center text-[10px] font-medium"
              style={{ 
                backgroundColor: p.userColor,
                color: getContrastColor(p.userColor),
              }}
              title={p.userName}
            >
              {p.userName[0].toUpperCase()}
            </div>
          ))}
          {activeParticipants.length > 3 && (
            <div className="w-6 h-6 rounded-full ring-2 ring-slate-900 bg-slate-700 text-slate-300 flex items-center justify-center text-[10px] font-medium">
              +{activeParticipants.length - 3}
            </div>
          )}
        </div>

        {onViewParticipants && (
          <button
            onClick={onViewParticipants}
            className="text-xs text-slate-400 hover:text-white transition-colors"
          >
            {activeParticipants.length} active
          </button>
        )}
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Main Session Indicator Component
// -----------------------------------------------------------------------------

export function SessionIndicator({
  session,
  isConnected,
  isConnecting,
  error,
  stats,
  showDetails = false,
  variant = 'default',
  onReconnect,
  onLeave,
  onViewParticipants,
  className = '',
}: SessionIndicatorProps) {
  const [timeSinceActivity, setTimeSinceActivity] = useState<string>('');

  // Update time since last activity
  useEffect(() => {
    if (!session) return;

    const updateTime = () => {
      const diff = Date.now() - session.lastActivity.getTime();
      if (diff < 60000) {
        setTimeSinceActivity('Just now');
      } else if (diff < 3600000) {
        const mins = Math.floor(diff / 60000);
        setTimeSinceActivity(`${mins}m ago`);
      } else {
        const hours = Math.floor(diff / 3600000);
        setTimeSinceActivity(`${hours}h ago`);
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, [session?.lastActivity]);

  // No session state
  if (!session) {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <ConnectionStatus
          isConnected={isConnected}
          isConnecting={isConnecting}
          error={error}
          onReconnect={onReconnect}
        />
        {!isConnected && !isConnecting && !error && (
          <span className="text-xs text-slate-500">No active session</span>
        )}
      </div>
    );
  }

  // Compact variant
  if (variant === 'compact') {
    return (
      <CompactIndicator
        session={session}
        isConnected={isConnected}
        onViewParticipants={onViewParticipants}
      />
    );
  }

  const statusConfig = SESSION_STATUS_CONFIG[session.status];

  // Default variant
  if (variant === 'default') {
    return (
      <div className={`flex items-center gap-4 ${className}`}>
        {/* Connection + Status */}
        <div className="flex items-center gap-2">
          <ActivityPulse 
            isActive={isConnected && session.status === 'active'} 
            color={isConnected ? '#10B981' : '#64748B'}
          />
          <span className={`text-sm font-medium ${statusConfig?.color ?? ''}`}>
            {statusConfig.label}
          </span>
        </div>

        {/* Participants */}
        <ParticipantCountBadge
          participants={session.participants}
          onClick={onViewParticipants}
        />

        {/* Last activity */}
        {showDetails && (
          <span className="text-xs text-slate-500">
            Last edit: {timeSinceActivity}
          </span>
        )}

        {/* Actions */}
        {onLeave && (
          <button
            onClick={onLeave}
            className="text-xs text-slate-400 hover:text-red-400 transition-colors"
          >
            Leave
          </button>
        )}
      </div>
    );
  }

  // Expanded variant
  return (
    <div className={`bg-slate-900 border border-slate-800 rounded-lg p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <ActivityPulse 
            isActive={isConnected && session.status === 'active'} 
            color={isConnected ? '#10B981' : '#64748B'}
          />
          <div>
            <h3 className="text-sm font-medium text-white">Collaborative Session</h3>
            <p className="text-xs text-slate-400">
              {session.documentId}
            </p>
          </div>
        </div>
        
        <div className={`px-2 py-1 rounded text-xs font-medium ${statusConfig?.color ?? ''} ${statusConfig.bgColor}`}>
          {statusConfig.label}
        </div>
      </div>

      {/* Connection Status */}
      <div className="mb-4">
        <ConnectionStatus
          isConnected={isConnected}
          isConnecting={isConnecting}
          error={error}
          onReconnect={onReconnect}
        />
      </div>

      {/* Participants */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-slate-400 uppercase">
            Participants ({session.participants.length})
          </span>
          {onViewParticipants && (
            <button
              onClick={onViewParticipants}
              className="text-xs text-accent-blue hover:text-accent-blue/80"
            >
              View All
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {session.participants.slice(0, 6).map(p => (
            <div
              key={p.userId}
              className="flex items-center gap-2 px-2 py-1 bg-slate-800/50 rounded-full"
            >
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-medium"
                style={{ 
                  backgroundColor: p.userColor,
                  color: getContrastColor(p.userColor),
                }}
              >
                {p.userName[0].toUpperCase()}
              </div>
              <span className="text-xs text-slate-300">{p.userName}</span>
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  p.presence.status === 'active' ? 'bg-green-500' :
                  p.presence.status === 'idle' ? 'bg-amber-500' : 'bg-slate-500'
                }`}
              />
            </div>
          ))}
          {session.participants.length > 6 && (
            <div className="px-2 py-1 bg-slate-800/50 rounded-full text-xs text-slate-400">
              +{session.participants.length - 6} more
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <SessionStatsDisplay stats={stats} className="mb-4" />
      )}

      {/* Meta info */}
      <div className="flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-800">
        <span>Created: {session.createdAt.toLocaleTimeString()}</span>
        <span>Last activity: {timeSinceActivity}</span>
      </div>

      {/* Actions */}
      {onLeave && (
        <div className="mt-4 pt-3 border-t border-slate-800">
          <button
            onClick={onLeave}
            className="w-full py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
          >
            Leave Session
          </button>
        </div>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Mini Session Badge Component
// -----------------------------------------------------------------------------

export interface SessionBadgeProps {
  isActive: boolean;
  participantCount: number;
  onClick?: () => void;
  className?: string;
}

export function SessionBadge({ 
  isActive, 
  participantCount, 
  onClick,
  className = '',
}: SessionBadgeProps) {
  return (
    <button
      onClick={onClick}
      className={`
        inline-flex items-center gap-1.5 px-2 py-1 rounded-full
        ${isActive ? 'bg-green-500/20 text-green-400' : 'bg-slate-700 text-slate-400'}
        text-xs font-medium transition-colors
        ${onClick ? 'hover:brightness-110 cursor-pointer' : ''}
        ${className}
      `}
    >
      <ActivityPulse isActive={isActive} color={isActive ? '#10B981' : '#64748B'} />
      <span>{participantCount} collaborator{participantCount !== 1 ? 's' : ''}</span>
    </button>
  );
}

// -----------------------------------------------------------------------------
// Utility Functions
// -----------------------------------------------------------------------------

function getContrastColor(hexColor: string): string {
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#000000' : '#FFFFFF';
}

// -----------------------------------------------------------------------------
// Exports
// -----------------------------------------------------------------------------

export default SessionIndicator;
