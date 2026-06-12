/**
 * CollaborationPresence
 * Shows active participants with avatars, status indicators, and tooltips
 * 
 * v0.41.7 - Collaboration UI Components
 */


import React, { useState } from 'react';
import { Users, Circle, Eye, Edit3, Clock } from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

export interface Participant {
  id: string;
  name: string;
  color: string;
  isActive: boolean;
  isEditing: boolean;
  lastSeen: string;
  cursor?: {
    position: number;
    sectionId?: string;
  };
}

export interface CollaborationPresenceProps {
  participants: Participant[];
  currentUserId: string;
  maxVisible?: number;
  showStatus?: boolean;
  size?: 'sm' | 'md' | 'lg';
  onClick?: (participant: Participant) => void;
}

// =============================================================================
// HELPERS
// =============================================================================

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function getTimeAgo(timestamp: string): string {
  const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
  
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

// =============================================================================
// COMPONENT
// =============================================================================

export default function CollaborationPresence({
  participants,
  currentUserId,
  maxVisible = 5,
  showStatus = true,
  size = 'md',
  onClick,
}: CollaborationPresenceProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  
  // Filter out current user and sort by activity
  const otherParticipants = participants
    .filter(p => p.id !== currentUserId)
    .sort((a, b) => {
      // Active first, then editing, then by last seen
      if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
      if (a.isEditing !== b.isEditing) return a.isEditing ? -1 : 1;
      return new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime();
    });
  
  const visibleParticipants = otherParticipants.slice(0, maxVisible);
  const overflowCount = otherParticipants.length - maxVisible;
  
  // Size configurations
  const sizeConfig = {
    sm: { avatar: 'w-6 h-6 text-xs', status: 'w-2 h-2', gap: '-space-x-1' },
    md: { avatar: 'w-8 h-8 text-sm', status: 'w-2.5 h-2.5', gap: '-space-x-2' },
    lg: { avatar: 'w-10 h-10 text-base', status: 'w-3 h-3', gap: '-space-x-2' },
  }[size];
  
  if (otherParticipants.length === 0) {
    return (
      <div className="flex items-center gap-2 text-gray-500 text-sm">
        <Users className="w-4 h-4" />
        <span>Only you</span>
      </div>
    );
  }
  
  return (
    <div className="flex items-center gap-3">
      {/* Participant Avatars */}
      <div className={`flex ${sizeConfig.gap}`}>
        {visibleParticipants.map((participant) => (
          <div
            key={participant.id}
            className="relative"
            onMouseEnter={() => setHoveredId(participant.id)}
            onMouseLeave={() => setHoveredId(null)}
          >
            {/* Avatar */}
            <button
              onClick={() => onClick?.(participant)}
              className={`
                ${sizeConfig.avatar} rounded-full flex items-center justify-center
                font-medium border-2 border-[#1a1f28] transition-transform
                hover:scale-110 hover:z-10
              `}
              style={{ backgroundColor: participant.color }}
            >
              {getInitials(participant.name)}
            </button>
            
            {/* Status Indicator */}
            {showStatus && (
              <span
                className={`
                  absolute -bottom-0.5 -right-0.5 ${sizeConfig.status} rounded-full
                  border border-[#1a1f28]
                  ${participant.isEditing 
                    ? 'bg-emerald-500 animate-pulse' 
                    : participant.isActive 
                      ? 'bg-emerald-500' 
                      : 'bg-gray-500'
                  }
                `}
              />
            )}
            
            {/* Tooltip */}
            {hoveredId === participant.id && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50">
                <div className="bg-[#252d3a] border border-white/10 rounded-lg px-3 py-2 shadow-xl whitespace-nowrap">
                  <div className="text-white font-medium text-sm">{participant.name}</div>
                  <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                    {participant.isEditing ? (
                      <>
                        <Edit3 className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-400">Editing</span>
                      </>
                    ) : participant.isActive ? (
                      <>
                        <Eye className="w-3 h-3 text-blue-400" />
                        <span className="text-blue-400">Viewing</span>
                      </>
                    ) : (
                      <>
                        <Clock className="w-3 h-3" />
                        <span>{getTimeAgo(participant.lastSeen)}</span>
                      </>
                    )}
                  </div>
                  {/* Arrow */}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px">
                    <div className="border-4 border-transparent border-t-[#252d3a]" />
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
        
        {/* Overflow indicator */}
        {overflowCount > 0 && (
          <div
            className={`
              ${sizeConfig.avatar} rounded-full flex items-center justify-center
              font-medium bg-gray-600 border-2 border-[#1a1f28]
            `}
          >
            +{overflowCount}
          </div>
        )}
      </div>
      
      {/* Count label */}
      <span className="text-sm text-gray-400">
        {otherParticipants.length} {otherParticipants.length === 1 ? 'collaborator' : 'collaborators'}
      </span>
    </div>
  );
}

// =============================================================================
// EXPANDED LIST VARIANT
// =============================================================================

export function CollaborationPresenceList({
  participants,
  currentUserId,
  onJumpTo,
}: {
  participants: Participant[];
  currentUserId: string;
  onJumpTo?: (participant: Participant) => void;
}) {
  const otherParticipants = participants.filter(p => p.id !== currentUserId);
  
  return (
    <div className="space-y-2">
      <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">
        Collaborators ({otherParticipants.length})
      </div>
      
      {otherParticipants.length === 0 ? (
        <div className="text-sm text-gray-500 py-2">No other collaborators</div>
      ) : (
        <div className="space-y-1">
          {otherParticipants.map((participant) => (
            <div
              key={participant.id}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors"
            >
              {/* Avatar */}
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium"
                style={{ backgroundColor: participant.color }}
              >
                {getInitials(participant.name)}
              </div>
              
              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="text-white text-sm font-medium truncate">
                  {participant.name}
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-400">
                  {participant.isEditing ? (
                    <>
                      <Circle className="w-2 h-2 fill-emerald-500 text-emerald-500" />
                      <span>Editing</span>
                    </>
                  ) : participant.isActive ? (
                    <>
                      <Circle className="w-2 h-2 fill-blue-500 text-blue-500" />
                      <span>Viewing</span>
                    </>
                  ) : (
                    <>
                      <Circle className="w-2 h-2 fill-gray-500 text-gray-500" />
                      <span>Away</span>
                    </>
                  )}
                </div>
              </div>
              
              {/* Jump to cursor button */}
              {participant.cursor && onJumpTo && (
                <button
                  onClick={() => onJumpTo(participant)}
                  className="p-1.5 rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                  title="Jump to cursor"
                >
                  <Eye className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
