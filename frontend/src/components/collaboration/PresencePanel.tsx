/**
 * PresencePanel
 * Shows who's viewing what section in real-time
 * 
 * v0.41.9 - Presence UI Panel
 */


import React, { useState, useMemo } from 'react';
import {
  Users,
  Eye,
  Edit3,
  Clock,
  ChevronRight,
  ChevronDown,
  MapPin,
  Zap,
  Coffee,
  Moon,
} from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

export type PresenceStatus = 'active' | 'idle' | 'away' | 'offline';

export interface UserPresenceData {
  userId: string;
  userName: string;
  userColor: string;
  status: PresenceStatus;
  isTyping: boolean;
  focusedSectionId: string | null;
  focusedSectionTitle?: string;
  lastActivity: number;
  viewportStart?: number;
  viewportEnd?: number;
}

export interface Section {
  id: string;
  title: string;
  sectionNumber: string;
  level: number;
}

export interface PresencePanelProps {
  participants: UserPresenceData[];
  sections: Section[];
  currentUserId: string;
  currentSectionId?: string;
  onJumpToUser?: (userId: string) => void;
  onJumpToSection?: (sectionId: string) => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

// =============================================================================
// HELPERS
// =============================================================================

function getInitials(name: string): string {
  return name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2);
}

function getTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}

function getStatusIcon(status: PresenceStatus, isTyping: boolean) {
  if (isTyping) return <Edit3 className="w-3 h-3 text-emerald-400" />;
  switch (status) {
    case 'active': return <Zap className="w-3 h-3 text-emerald-400" />;
    case 'idle': return <Coffee className="w-3 h-3 text-amber-400" />;
    case 'away': return <Moon className="w-3 h-3 text-gray-400" />;
    default: return <Clock className="w-3 h-3 text-gray-500" />;
  }
}

function getStatusLabel(status: PresenceStatus, isTyping: boolean): string {
  if (isTyping) return 'Typing...';
  switch (status) {
    case 'active': return 'Active';
    case 'idle': return 'Idle';
    case 'away': return 'Away';
    default: return 'Offline';
  }
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function PresencePanel({
  participants,
  sections,
  currentUserId,
  currentSectionId,
  onJumpToUser,
  onJumpToSection,
  collapsed = false,
  onToggleCollapse,
}: PresencePanelProps) {
  const [viewMode, setViewMode] = useState<'users' | 'sections'>('users');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  // Filter out current user and offline users
  const otherParticipants = useMemo(() => 
    participants.filter(p => p.userId !== currentUserId && p.status !== 'offline'),
    [participants, currentUserId]
  );

  // Group by section
  const participantsBySection = useMemo(() => {
    const map = new Map<string, UserPresenceData[]>();
    
    // Initialize with all sections
    sections.forEach(s => map.set(s.id, []));
    map.set('no-section', []); // For users not in any section
    
    otherParticipants.forEach(p => {
      const sectionId = p.focusedSectionId || 'no-section';
      if (!map.has(sectionId)) map.set(sectionId, []);
      map.get(sectionId)!.push(p);
    });
    
    return map;
  }, [otherParticipants, sections]);

  // Sections with users
  const sectionsWithUsers = useMemo(() => 
    sections.filter(s => (participantsBySection.get(s.id)?.length || 0) > 0),
    [sections, participantsBySection]
  );

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  };

  if (collapsed) {
    return (
      <button
        onClick={onToggleCollapse}
        className="w-10 h-full bg-[#1a1f28] border-l border-white/10 flex flex-col items-center py-4 gap-2"
      >
        <Users className="w-5 h-5 text-gray-400" />
        {otherParticipants.length > 0 && (
          <span className="w-6 h-6 bg-blue-600 text-white text-xs font-medium rounded-full flex items-center justify-center">
            {otherParticipants.length}
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="hidden xl:flex w-64 h-full bg-[#1a1f28] border-l border-white/10 flex flex-col">
      {/* Header */}
      <div className="p-3 border-b border-white/10">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-medium text-white">
              Collaborators ({otherParticipants.length})
            </span>
          </div>
          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="p-1 hover:bg-white/5 rounded text-gray-400"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
        
        {/* View Toggle */}
        <div className="flex bg-[#252d3a] rounded-lg p-0.5">
          <button
            onClick={() => setViewMode('users')}
            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
              viewMode === 'users' 
                ? 'bg-blue-600 text-white' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            By User
          </button>
          <button
            onClick={() => setViewMode('sections')}
            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
              viewMode === 'sections' 
                ? 'bg-blue-600 text-white' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            By Section
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {otherParticipants.length === 0 ? (
          <div className="p-4 text-center text-gray-500 text-sm">
            No other collaborators
          </div>
        ) : viewMode === 'users' ? (
          <UserListView
            participants={otherParticipants}
            sections={sections}
            onJumpToUser={onJumpToUser}
            onJumpToSection={onJumpToSection}
          />
        ) : (
          <SectionListView
            sections={sectionsWithUsers}
            participantsBySection={participantsBySection}
            currentSectionId={currentSectionId}
            expandedSections={expandedSections}
            onToggleSection={toggleSection}
            onJumpToUser={onJumpToUser}
            onJumpToSection={onJumpToSection}
          />
        )}
      </div>

      {/* Current Section Indicator */}
      {currentSectionId && (
        <div className="p-3 border-t border-white/10 bg-[#252d3a]">
          <div className="text-xs text-gray-500 mb-1">You're viewing</div>
          <div className="text-sm text-white truncate">
            {sections.find(s => s.id === currentSectionId)?.title || 'Unknown section'}
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// USER LIST VIEW
// =============================================================================

function UserListView({
  participants,
  sections,
  onJumpToUser,
  onJumpToSection,
}: {
  participants: UserPresenceData[];
  sections: Section[];
  onJumpToUser?: (userId: string) => void;
  onJumpToSection?: (sectionId: string) => void;
}) {
  // Sort: typing first, then active, then by last activity
  const sorted = useMemo(() => 
    [...participants].sort((a, b) => {
      if (a.isTyping !== b.isTyping) return a.isTyping ? -1 : 1;
      if (a.status !== b.status) {
        const order = { active: 0, idle: 1, away: 2, offline: 3 };
        return order[a.status] - order[b.status];
      }
      return b.lastActivity - a.lastActivity;
    }),
    [participants]
  );

  return (
    <div className="divide-y divide-white/5">
      {sorted.map(user => {
        const section = sections.find(s => s.id === user.focusedSectionId);
        
        return (
          <div
            key={user.userId}
            className="p-3 hover:bg-white/5 transition-colors"
          >
            <div className="flex items-start gap-3">
              {/* Avatar */}
              <div className="relative">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium"
                  style={{ backgroundColor: user.userColor }}
                >
                  {getInitials(user.userName)}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5">
                  {getStatusIcon(user.status, user.isTyping)}
                </div>
              </div>
              
              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-white truncate">
                    {user.userName}
                  </span>
                  {user.isTyping && (
                    <span className="text-[10px] text-emerald-400 animate-pulse">
                      typing...
                    </span>
                  )}
                </div>
                
                <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                  {getStatusIcon(user.status, false)}
                  <span>{getStatusLabel(user.status, false)}</span>
                  <span>·</span>
                  <span>{getTimeAgo(user.lastActivity)}</span>
                </div>
                
                {/* Section */}
                {section && (
                  <button
                    onClick={() => onJumpToSection?.(section.id)}
                    className="flex items-center gap-1 mt-1.5 text-xs text-blue-400 hover:text-blue-300"
                  >
                    <MapPin className="w-3 h-3" />
                    <span className="truncate">{section.sectionNumber} {section.title}</span>
                  </button>
                )}
              </div>
              
              {/* Jump button */}
              {onJumpToUser && (
                <button
                  onClick={() => onJumpToUser(user.userId)}
                  className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded"
                  title="Jump to cursor"
                >
                  <Eye className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// =============================================================================
// SECTION LIST VIEW
// =============================================================================

function SectionListView({
  sections,
  participantsBySection,
  currentSectionId,
  expandedSections,
  onToggleSection,
  onJumpToUser,
  onJumpToSection,
}: {
  sections: Section[];
  participantsBySection: Map<string, UserPresenceData[]>;
  currentSectionId?: string;
  expandedSections: Set<string>;
  onToggleSection: (sectionId: string) => void;
  onJumpToUser?: (userId: string) => void;
  onJumpToSection?: (sectionId: string) => void;
}) {
  if (sections.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500 text-sm">
        No sections with collaborators
      </div>
    );
  }

  return (
    <div className="divide-y divide-white/5">
      {sections.map(section => {
        const users = participantsBySection.get(section.id) || [];
        const isExpanded = expandedSections.has(section.id);
        const isCurrent = section.id === currentSectionId;
        
        return (
          <div key={section.id}>
            {/* Section Header */}
            <button
              onClick={() => onToggleSection(section.id)}
              className={`w-full p-3 flex items-center gap-2 hover:bg-white/5 transition-colors ${
                isCurrent ? 'bg-blue-500/10' : ''
              }`}
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-400" />
              )}
              
              <div className="flex-1 text-left min-w-0">
                <div className="text-sm text-white truncate">
                  {section.sectionNumber} {section.title}
                </div>
              </div>
              
              {/* User avatars preview */}
              <div className="flex -space-x-1">
                {users.slice(0, 3).map(u => (
                  <div
                    key={u.userId}
                    className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-medium border border-[#1a1f28]"
                    style={{ backgroundColor: u.userColor }}
                    title={u.userName}
                  >
                    {getInitials(u.userName)}
                  </div>
                ))}
                {users.length > 3 && (
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-medium bg-gray-600 border border-[#1a1f28]">
                    +{users.length - 3}
                  </div>
                )}
              </div>
            </button>
            
            {/* Expanded User List */}
            {isExpanded && (
              <div className="bg-[#252d3a]/50 px-3 pb-2">
                {users.map(user => (
                  <div
                    key={user.userId}
                    className="flex items-center gap-2 py-2"
                  >
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium"
                      style={{ backgroundColor: user.userColor }}
                    >
                      {getInitials(user.userName)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white truncate">{user.userName}</div>
                      <div className="flex items-center gap-1 text-[10px] text-gray-500">
                        {getStatusIcon(user.status, user.isTyping)}
                        <span>{user.isTyping ? 'Typing...' : getStatusLabel(user.status, false)}</span>
                      </div>
                    </div>
                    {onJumpToUser && (
                      <button
                        onClick={() => onJumpToUser(user.userId)}
                        className="p-1 text-gray-400 hover:text-white"
                        title="Jump to cursor"
                      >
                        <Eye className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
                
                {onJumpToSection && (
                  <button
                    onClick={() => onJumpToSection(section.id)}
                    className="w-full mt-1 py-1.5 text-xs text-blue-400 hover:text-blue-300 hover:bg-white/5 rounded"
                  >
                    Go to section →
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// =============================================================================
// SECTION PRESENCE BADGE (for inline use)
// =============================================================================

export function SectionPresenceBadge({
  users,
  maxVisible = 3,
  size = 'sm',
}: {
  users: UserPresenceData[];
  maxVisible?: number;
  size?: 'sm' | 'md';
}) {
  if (users.length === 0) return null;
  
  const sizeClass = size === 'sm' ? 'w-5 h-5 text-[9px]' : 'w-6 h-6 text-[10px]';
  
  return (
    <div className="flex items-center">
      <div className={`flex ${size === 'sm' ? '-space-x-1' : '-space-x-1.5'}`}>
        {users.slice(0, maxVisible).map(u => (
          <div
            key={u.userId}
            className={`${sizeClass} rounded-full flex items-center justify-center font-medium border border-[#1a1f28] relative`}
            style={{ backgroundColor: u.userColor }}
            title={u.userName}
          >
            {getInitials(u.userName)}
            {u.isTyping && (
              <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            )}
          </div>
        ))}
        {users.length > maxVisible && (
          <div className={`${sizeClass} rounded-full flex items-center justify-center font-medium bg-gray-600 border border-[#1a1f28]`}>
            +{users.length - maxVisible}
          </div>
        )}
      </div>
    </div>
  );
}
