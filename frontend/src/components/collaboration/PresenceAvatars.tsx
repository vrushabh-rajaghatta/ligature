
// =============================================================================
// PRESENCE AVATARS COMPONENT
// =============================================================================
// Displays active users in a collaborative session with status indicators
// Part of v0.18.9 - Collaboration UI Components
// =============================================================================


import { useState, useMemo, useCallback } from 'react';
import { type UserPresence, type PresenceStatus } from '@/services/collaboration/presence-service';
import { type SessionParticipant } from '@/services/collaboration/session-manager';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface PresenceAvatarsProps {
  participants: SessionParticipant[] | UserPresence[];
  localUserId?: string;
  maxVisible?: number;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showStatus?: boolean;
  showTooltip?: boolean;
  stackDirection?: 'left' | 'right';
  onUserClick?: (user: UserPresence | SessionParticipant) => void;
  onOverflowClick?: () => void;
  className?: string;
}

export interface UserAvatarProps {
  user: UserPresence | SessionParticipant;
  size: 'xs' | 'sm' | 'md' | 'lg';
  showStatus: boolean;
  showTooltip: boolean;
  isLocal?: boolean;
  onClick?: () => void;
  className?: string;
}

export interface PresenceTooltipProps {
  user: UserPresence | SessionParticipant;
  position?: 'top' | 'bottom';
}

export interface OverflowIndicatorProps {
  count: number;
  size: 'xs' | 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const SIZE_CONFIG = {
  xs: {
    avatar: 'w-6 h-6',
    text: 'text-[10px]',
    status: 'w-2 h-2',
    statusOffset: '-right-0.5 -bottom-0.5',
    overlap: '-ml-1.5',
  },
  sm: {
    avatar: 'w-8 h-8',
    text: 'text-xs',
    status: 'w-2.5 h-2.5',
    statusOffset: '-right-0.5 -bottom-0.5',
    overlap: '-ml-2',
  },
  md: {
    avatar: 'w-10 h-10',
    text: 'text-sm',
    status: 'w-3 h-3',
    statusOffset: '-right-0.5 -bottom-0.5',
    overlap: '-ml-2.5',
  },
  lg: {
    avatar: 'w-12 h-12',
    text: 'text-base',
    status: 'w-3.5 h-3.5',
    statusOffset: '-right-0.5 -bottom-0.5',
    overlap: '-ml-3',
  },
};

const STATUS_COLORS: Record<PresenceStatus, string> = {
  active: 'bg-green-500',
  idle: 'bg-amber-500',
  away: 'bg-slate-400',
  offline: 'bg-slate-600',
};

const STATUS_LABELS: Record<PresenceStatus, string> = {
  active: 'Active',
  idle: 'Idle',
  away: 'Away',
  offline: 'Offline',
};

// -----------------------------------------------------------------------------
// Utility Functions
// -----------------------------------------------------------------------------

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getUserPresence(user: UserPresence | SessionParticipant): UserPresence {
  if ('presence' in user) {
    return user.presence;
  }
  return user as UserPresence;
}

function getUserInfo(user: UserPresence | SessionParticipant) {
  if ('presence' in user) {
    return {
      userId: user.userId,
      userName: user.userName,
      userColor: user.userColor,
      status: user.presence.status,
    };
  }
  return {
    userId: user.userId,
    userName: user.userName,
    userColor: user.userColor,
    status: user.status,
  };
}

// -----------------------------------------------------------------------------
// Presence Tooltip Component
// -----------------------------------------------------------------------------

export function PresenceTooltip({ user, position = 'bottom' }: PresenceTooltipProps) {
  const info = getUserInfo(user);
  
  const positionClasses = position === 'top'
    ? 'bottom-full mb-2'
    : 'top-full mt-2';

  return (
    <div
      className={`
        absolute left-1/2 -translate-x-1/2 ${positionClasses}
        px-3 py-2 rounded-lg
        bg-slate-800 border border-slate-700
        shadow-lg z-50
        whitespace-nowrap
        animate-in fade-in-0 zoom-in-95 duration-150
      `}
    >
      <div className="flex items-center gap-2">
        <div
          className="w-3 h-3 rounded-full flex-shrink-0"
          style={{ backgroundColor: info.userColor }}
        />
        <div>
          <div className="text-sm font-medium text-white">{info.userName}</div>
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span
              className={`w-1.5 h-1.5 rounded-full ${STATUS_COLORS[info.status]}`}
            />
            {STATUS_LABELS[info.status]}
          </div>
        </div>
      </div>
      {/* Arrow */}
      <div
        className={`
          absolute left-1/2 -translate-x-1/2
          w-2 h-2 rotate-45 bg-slate-800 border-slate-700
          ${position === 'top' 
            ? 'top-full -mt-1 border-r border-b' 
            : 'bottom-full -mb-1 border-l border-t'
          }
        `}
      />
    </div>
  );
}

// -----------------------------------------------------------------------------
// User Avatar Component
// -----------------------------------------------------------------------------

export function UserAvatar({
  user,
  size,
  showStatus,
  showTooltip,
  isLocal = false,
  onClick,
  className = '',
}: UserAvatarProps) {
  const [isHovered, setIsHovered] = useState(false);
  const config = SIZE_CONFIG[size];
  const info = getUserInfo(user);
  const initials = getInitials(info.userName);

  return (
    <div
      className={`
        relative inline-flex
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
    >
      {/* Avatar */}
      <div
        className={`
          ${config.avatar}
          rounded-full flex items-center justify-center
          font-medium
          ring-2 ring-slate-900
          transition-transform duration-150
          ${onClick ? 'hover:scale-105' : ''}
          ${isLocal ? 'ring-accent-blue' : ''}
        `}
        style={{
          backgroundColor: info.userColor,
          color: getContrastColor(info.userColor),
        }}
        title={!showTooltip ? `${info.userName} (${STATUS_LABELS[info.status]})` : undefined}
      >
        <span className={config.text}>{initials}</span>
      </div>

      {/* Status indicator */}
      {showStatus && (
        <span
          className={`
            absolute ${config.statusOffset}
            ${config.status}
            rounded-full
            ${STATUS_COLORS[info.status]}
            ring-2 ring-slate-900
            ${info.status === 'active' ? 'animate-pulse' : ''}
          `}
        />
      )}

      {/* Tooltip */}
      {showTooltip && isHovered && (
        <PresenceTooltip user={user} position="bottom" />
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Overflow Indicator Component
// -----------------------------------------------------------------------------

export function OverflowIndicator({ count, size, onClick }: OverflowIndicatorProps) {
  const config = SIZE_CONFIG[size];

  return (
    <button
      className={`
        ${config.avatar}
        rounded-full flex items-center justify-center
        bg-slate-700 text-slate-300
        font-medium ${config?.text ?? ''}
        ring-2 ring-slate-900
        hover:bg-slate-600 transition-colors
      `}
      onClick={onClick}
      title={`${count} more user${count !== 1 ? 's' : ''}`}
    >
      +{count}
    </button>
  );
}

// -----------------------------------------------------------------------------
// Presence Avatars Container
// -----------------------------------------------------------------------------

export function PresenceAvatars({
  participants,
  localUserId,
  maxVisible = 5,
  size = 'sm',
  showStatus = true,
  showTooltip = true,
  stackDirection = 'right',
  onUserClick,
  onOverflowClick,
  className = '',
}: PresenceAvatarsProps) {
  const config = SIZE_CONFIG[size];

  // Sort participants: local user first, then active, then by name
  const sortedParticipants = useMemo(() => {
    return [...participants].sort((a, b) => {
      const infoA = getUserInfo(a);
      const infoB = getUserInfo(b);

      // Local user first
      if (infoA.userId === localUserId) return -1;
      if (infoB.userId === localUserId) return 1;

      // Active users before inactive
      const statusOrder: Record<PresenceStatus, number> = {
        active: 0,
        idle: 1,
        away: 2,
        offline: 3,
      };
      const statusDiff = statusOrder[infoA.status] - statusOrder[infoB.status];
      if (statusDiff !== 0) return statusDiff;

      // Alphabetical by name
      return infoA.userName.localeCompare(infoB.userName);
    });
  }, [participants, localUserId]);

  const visibleParticipants = sortedParticipants.slice(0, maxVisible);
  const overflowCount = sortedParticipants.length - maxVisible;

  const handleUserClick = useCallback((user: UserPresence | SessionParticipant) => {
    onUserClick?.(user);
  }, [onUserClick]);

  if (participants.length === 0) {
    return null;
  }

  return (
    <div
      className={`flex items-center ${className}`}
      style={{ flexDirection: stackDirection === 'left' ? 'row-reverse' : 'row' }}
      role="group"
      aria-label={`${participants.length} participant${participants.length !== 1 ? 's' : ''}`}
    >
      {visibleParticipants.map((user, index) => {
        const info = getUserInfo(user);
        const isFirst = index === 0;
        const isLocal = info.userId === localUserId;

        return (
          <div
            key={info.userId}
            className={!isFirst ? config.overlap : ''}
            style={{ zIndex: maxVisible - index }}
          >
            <UserAvatar
              user={user}
              size={size}
              showStatus={showStatus}
              showTooltip={showTooltip}
              isLocal={isLocal}
              onClick={onUserClick ? () => handleUserClick(user) : undefined}
            />
          </div>
        );
      })}

      {overflowCount > 0 && (
        <div className={config.overlap} style={{ zIndex: 0 }}>
          <OverflowIndicator
            count={overflowCount}
            size={size}
            onClick={onOverflowClick}
          />
        </div>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Presence List Component
// -----------------------------------------------------------------------------

export interface PresenceListProps {
  participants: SessionParticipant[] | UserPresence[];
  localUserId?: string;
  onUserClick?: (user: UserPresence | SessionParticipant) => void;
  className?: string;
}

export function PresenceList({
  participants,
  localUserId,
  onUserClick,
  className = '',
}: PresenceListProps) {
  // Group by status
  const groupedParticipants = useMemo(() => {
    const groups: Record<PresenceStatus, Array<UserPresence | SessionParticipant>> = {
      active: [],
      idle: [],
      away: [],
      offline: [],
    };

    participants.forEach(user => {
      const info = getUserInfo(user);
      groups[info.status].push(user);
    });

    return groups;
  }, [participants]);

  const statusOrder: PresenceStatus[] = ['active', 'idle', 'away', 'offline'];

  return (
    <div className={`space-y-4 ${className}`}>
      {statusOrder.map(status => {
        const users = groupedParticipants[status];
        if (users.length === 0) return null;

        return (
          <div key={status}>
            <div className="flex items-center gap-2 mb-2">
              <span
                className={`w-2 h-2 rounded-full ${STATUS_COLORS[status]}`}
              />
              <span className="text-xs font-medium text-slate-400 uppercase">
                {STATUS_LABELS[status]} ({users.length})
              </span>
            </div>
            <div className="space-y-1">
              {users.map(user => {
                const info = getUserInfo(user);
                const isLocal = info.userId === localUserId;

                return (
                  <button
                    key={info.userId}
                    className={`
                      w-full flex items-center gap-3 px-3 py-2
                      rounded-lg text-left
                      hover:bg-slate-800/50 transition-colors
                      ${onUserClick ? 'cursor-pointer' : ''}
                    `}
                    onClick={() => onUserClick?.(user)}
                    disabled={!onUserClick}
                  >
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0"
                      style={{
                        backgroundColor: info.userColor,
                        color: getContrastColor(info.userColor),
                      }}
                    >
                      {getInitials(info.userName)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white truncate">
                        {info.userName}
                        {isLocal && (
                          <span className="text-xs text-slate-400 ml-1">(you)</span>
                        )}
                      </div>
                    </div>
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: info.userColor }}
                    />
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
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

export default PresenceAvatars;
