/**
 * CollaborationToolbar
 * Unified toolbar for collaboration features: presence, session status, controls
 * 
 * v0.41.7 - Collaboration UI Components
 */


import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Wifi,
  WifiOff,
  Share2,
  Copy,
  Check,
  LogOut,
  Settings,
  Eye,
  Edit3,
  Clock,
  AlertCircle,
  RefreshCw,
  ChevronDown,
} from 'lucide-react';

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
  cursor?: { position: number; sectionId?: string };
}

export interface CollaborationSession {
  id: string;
  documentId: string;
  documentTitle: string;
  status: 'active' | 'idle' | 'closed';
  version: number;
  participants: Participant[];
  ownerId: string;
}

export interface CollaborationToolbarProps {
  session: CollaborationSession | null;
  currentUserId: string;
  currentUserName: string;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  onJoin: () => void;
  onLeave: () => void;
  onReconnect: () => void;
  onShareLink?: () => void;
  onJumpToCursor?: (participant: Participant) => void;
  className?: string;
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
  if (seconds < 60) return 'now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  return `${Math.floor(seconds / 3600)}h`;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function CollaborationToolbar({
  session,
  currentUserId,
  currentUserName,
  isConnected,
  isConnecting,
  error,
  onJoin,
  onLeave,
  onReconnect,
  onShareLink,
  onJumpToCursor,
  className = '',
}: CollaborationToolbarProps) {
  const [showParticipants, setShowParticipants] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const otherParticipants = session?.participants.filter(p => p.id !== currentUserId) || [];
  const activeCount = otherParticipants.filter(p => p.isActive).length;
  const isOwner = session?.ownerId === currentUserId;

  // Copy session link
  const handleCopyLink = useCallback(() => {
    if (!session) return;
    const url = `${window.location.origin}${window.location.pathname}?sessionId=${session.id}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [session]);

  // Not in session - show join button
  if (!session && !isConnecting) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <button
          onClick={onJoin}
          className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 
                     text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Users className="w-4 h-4" />
          Start Collaborating
        </button>
      </div>
    );
  }

  // Connecting state
  if (isConnecting) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-[#252d3a] rounded-lg">
          <RefreshCw className="w-4 h-4 text-blue-400 animate-spin" />
          <span className="text-sm text-gray-300">Connecting...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500/20 border border-red-500/30 rounded-lg">
          <AlertCircle className="w-4 h-4 text-red-400" />
          <span className="text-sm text-red-300">{error}</span>
          <button
            onClick={onReconnect}
            className="ml-2 text-xs text-red-400 hover:text-red-300 underline"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Connection Status */}
      <div className="flex items-center gap-1.5">
        {isConnected ? (
          <Wifi className="w-4 h-4 text-emerald-400" />
        ) : (
          <WifiOff className="w-4 h-4 text-red-400" />
        )}
        <span className="text-xs text-gray-400">
          {isConnected ? 'Live' : 'Disconnected'}
        </span>
      </div>

      {/* Divider */}
      <div className="w-px h-6 bg-white/10" />

      {/* Participant Avatars */}
      <div className="relative">
        <button
          onClick={() => setShowParticipants(!showParticipants)}
          className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-white/5 transition-colors"
        >
          {/* Avatar Stack */}
          <div className="flex -space-x-2">
            {otherParticipants.slice(0, 3).map((p) => (
              <div
                key={p.id}
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium
                           border-2 border-[#1a1f28] relative"
                style={{ backgroundColor: p.color }}
                title={p.name}
              >
                {getInitials(p.name)}
                {p.isActive && (
                  <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full border border-[#1a1f28]" />
                )}
              </div>
            ))}
            {otherParticipants.length > 3 && (
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium
                              bg-gray-600 border-2 border-[#1a1f28]">
                +{otherParticipants.length - 3}
              </div>
            )}
            {otherParticipants.length === 0 && (
              <div className="text-sm text-gray-500">Only you</div>
            )}
          </div>
          
          {/* Count */}
          {otherParticipants.length > 0 && (
            <>
              <span className="text-sm text-gray-300">
                {activeCount} active
              </span>
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showParticipants ? 'rotate-180' : ''}`} />
            </>
          )}
        </button>

        {/* Dropdown */}
        {showParticipants && otherParticipants.length > 0 && (
          <div className="absolute top-full right-0 mt-2 w-64 bg-[#252d3a] border border-white/10 
                          rounded-lg shadow-xl z-50 overflow-hidden">
            <div className="p-2 border-b border-white/10">
              <span className="text-xs font-medium text-gray-500 uppercase">
                Collaborators ({otherParticipants.length})
              </span>
            </div>
            <div className="max-h-64 overflow-y-auto">
              {otherParticipants.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-3 px-3 py-2 hover:bg-white/5 transition-colors"
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium"
                    style={{ backgroundColor: p.color }}
                  >
                    {getInitials(p.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white truncate">{p.name}</div>
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                      {p.isEditing ? (
                        <>
                          <Edit3 className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400">Editing</span>
                        </>
                      ) : p.isActive ? (
                        <>
                          <Eye className="w-3 h-3 text-blue-400" />
                          <span className="text-blue-400">Viewing</span>
                        </>
                      ) : (
                        <>
                          <Clock className="w-3 h-3" />
                          <span>{getTimeAgo(p.lastSeen)}</span>
                        </>
                      )}
                    </div>
                  </div>
                  {p.cursor && onJumpToCursor && (
                    <button
                      onClick={() => {
                        onJumpToCursor(p);
                        setShowParticipants(false);
                      }}
                      className="p-1 text-gray-400 hover:text-white hover:bg-white/10 rounded"
                      title="Jump to cursor"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="w-px h-6 bg-white/10" />

      {/* Actions */}
      <div className="flex items-center gap-1">
        {/* Share */}
        <button
          onClick={onShareLink || handleCopyLink}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm text-gray-300 
                     hover:text-white hover:bg-white/5 rounded-lg transition-colors"
          title="Copy collaboration link"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-emerald-400" />
              <span className="text-emerald-400">Copied!</span>
            </>
          ) : (
            <>
              <Share2 className="w-4 h-4" />
              <span>Share</span>
            </>
          )}
        </button>

        {/* Leave */}
        <button
          onClick={onLeave}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm text-gray-300 
                     hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
          title="Leave collaboration session"
        >
          <LogOut className="w-4 h-4" />
          <span>Leave</span>
        </button>
      </div>

      {/* Version indicator */}
      {session && (
        <div className="text-xs text-gray-500 ml-2">
          v{session.version}
        </div>
      )}

      {/* Click outside handler */}
      {showParticipants && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowParticipants(false)}
        />
      )}
    </div>
  );
}

// =============================================================================
// MINI PRESENCE INDICATOR (for embedding in headers)
// =============================================================================

export function CollaborationMiniIndicator({
  participantCount,
  isConnected,
  onClick,
}: {
  participantCount: number;
  isConnected: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-white/5 transition-colors"
    >
      <div className="relative">
        <Users className="w-4 h-4 text-gray-400" />
        {isConnected && (
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full" />
        )}
      </div>
      {participantCount > 0 && (
        <span className="text-xs text-gray-400">{participantCount}</span>
      )}
    </button>
  );
}
