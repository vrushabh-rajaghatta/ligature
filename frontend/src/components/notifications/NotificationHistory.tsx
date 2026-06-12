/**
 * NotificationHistory
 * Full notification history page with filters
 * 
 * v0.42.2 - Notification History Page
 */


import React, { useState, useEffect, useMemo } from 'react';
import {
  Bell,
  Search,
  Filter,
  Check,
  CheckCheck,
  Trash2,
  Clock,
  FileText,
  UserCheck,
  UserX,
  AlertCircle,
  MessageSquare,
  Users,
  ChevronDown,
  X,
  Calendar,
  RefreshCw,
  Archive,
  ExternalLink,
} from 'lucide-react';
import { Notification, NotificationType, useNotifications } from '@/services/notification-service';

// =============================================================================
// TYPES
// =============================================================================

export interface NotificationHistoryProps {
  userId: string;
  onNavigate?: (url: string) => void;
}

interface FilterState {
  search: string;
  types: NotificationType[];
  readStatus: 'all' | 'read' | 'unread';
  dateRange: 'all' | 'today' | 'week' | 'month';
  sortBy: 'newest' | 'oldest';
}

// =============================================================================
// CONSTANTS
// =============================================================================

const NOTIFICATION_TYPE_CONFIG: Record<NotificationType, {
  label: string;
  icon: React.ReactNode;
  color: string;
  category: string;
}> = {
  'approval-submitted': {
    label: 'Submission',
    icon: <FileText className="w-4 h-4" />,
    color: 'text-blue-400',
    category: 'Approvals',
  },
  'approval-assigned': {
    label: 'Review Assigned',
    icon: <UserCheck className="w-4 h-4" />,
    color: 'text-purple-400',
    category: 'Approvals',
  },
  'approval-approved': {
    label: 'Approved',
    icon: <Check className="w-4 h-4" />,
    color: 'text-emerald-400',
    category: 'Approvals',
  },
  'approval-rejected': {
    label: 'Rejected',
    icon: <UserX className="w-4 h-4" />,
    color: 'text-red-400',
    category: 'Approvals',
  },
  'approval-changes-requested': {
    label: 'Changes Requested',
    icon: <AlertCircle className="w-4 h-4" />,
    color: 'text-amber-400',
    category: 'Approvals',
  },
  'approval-reminder': {
    label: 'Reminder',
    icon: <Clock className="w-4 h-4" />,
    color: 'text-amber-400',
    category: 'Approvals',
  },
  'approval-overdue': {
    label: 'Overdue',
    icon: <Clock className="w-4 h-4" />,
    color: 'text-red-400',
    category: 'Approvals',
  },
  'mention': {
    label: 'Mention',
    icon: <MessageSquare className="w-4 h-4" />,
    color: 'text-blue-400',
    category: 'Collaboration',
  },
  'comment': {
    label: 'Comment',
    icon: <MessageSquare className="w-4 h-4" />,
    color: 'text-gray-400',
    category: 'Collaboration',
  },
  'collaboration-invite': {
    label: 'Invite',
    icon: <Users className="w-4 h-4" />,
    color: 'text-purple-400',
    category: 'Collaboration',
  },
};

const ALL_TYPES = Object.keys(NOTIFICATION_TYPE_CONFIG) as NotificationType[];

// =============================================================================
// HELPERS
// =============================================================================

function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - timestamp;
  
  // Today
  if (date.toDateString() === now.toDateString()) {
    return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }
  
  // Yesterday
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return `Yesterday at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }
  
  // This week
  if (diff < 7 * 24 * 60 * 60 * 1000) {
    return date.toLocaleDateString([], { weekday: 'long', hour: '2-digit', minute: '2-digit' });
  }
  
  // Older
  return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

function groupByDate(notifications: Notification[]): Map<string, Notification[]> {
  const groups = new Map<string, Notification[]>();
  const now = new Date();
  
  for (const notif of notifications) {
    const date = new Date(notif.createdAt);
    let key: string;
    
    if (date.toDateString() === now.toDateString()) {
      key = 'Today';
    } else {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      if (date.toDateString() === yesterday.toDateString()) {
        key = 'Yesterday';
      } else if (now.getTime() - notif.createdAt < 7 * 24 * 60 * 60 * 1000) {
        key = 'This Week';
      } else if (now.getTime() - notif.createdAt < 30 * 24 * 60 * 60 * 1000) {
        key = 'This Month';
      } else {
        key = 'Older';
      }
    }
    
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(notif);
  }
  
  return groups;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function NotificationHistory({
  userId,
  onNavigate,
}: NotificationHistoryProps) {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications(userId);

  const [filters, setFilters] = useState<FilterState>({
    search: '',
    types: [],
    readStatus: 'all',
    dateRange: 'all',
    sortBy: 'newest',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Filter notifications
  const filteredNotifications = useMemo(() => {
    let filtered = [...notifications];
    
    // Search
    if (filters.search) {
      const search = filters.search.toLowerCase();
      filtered = filtered.filter(n => 
        n.title.toLowerCase().includes(search) ||
        n.message.toLowerCase().includes(search)
      );
    }
    
    // Types
    if (filters.types.length > 0) {
      filtered = filtered.filter(n => filters.types.includes(n.type));
    }
    
    // Read status
    if (filters.readStatus === 'read') {
      filtered = filtered.filter(n => n.isRead);
    } else if (filters.readStatus === 'unread') {
      filtered = filtered.filter(n => !n.isRead);
    }
    
    // Date range
    const now = Date.now();
    if (filters.dateRange === 'today') {
      const start = new Date().setHours(0, 0, 0, 0);
      filtered = filtered.filter(n => n.createdAt >= start);
    } else if (filters.dateRange === 'week') {
      filtered = filtered.filter(n => now - n.createdAt < 7 * 24 * 60 * 60 * 1000);
    } else if (filters.dateRange === 'month') {
      filtered = filtered.filter(n => now - n.createdAt < 30 * 24 * 60 * 60 * 1000);
    }
    
    // Sort
    filtered.sort((a, b) => 
      filters.sortBy === 'newest' 
        ? b.createdAt - a.createdAt 
        : a.createdAt - b.createdAt
    );
    
    return filtered;
  }, [notifications, filters]);

  // Group by date
  const groupedNotifications = useMemo(() => 
    groupByDate(filteredNotifications),
    [filteredNotifications]
  );

  const handleSelectAll = () => {
    if (selectedIds.size === filteredNotifications.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredNotifications.map(n => n.id)));
    }
  };

  const handleBulkMarkRead = () => {
    selectedIds.forEach(id => markAsRead(id));
    setSelectedIds(new Set());
  };

  const handleBulkDelete = () => {
    if (confirm(`Delete ${selectedIds.size} notification(s)?`)) {
      selectedIds.forEach(id => deleteNotification(id));
      setSelectedIds(new Set());
    }
  };

  const activeFilterCount = 
    (filters.types.length > 0 ? 1 : 0) +
    (filters.readStatus !== 'all' ? 1 : 0) +
    (filters.dateRange !== 'all' ? 1 : 0);

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-semibold text-white">Notifications</h1>
            <p className="text-gray-400 mt-1">
              {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
            </p>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="flex items-center gap-2 px-4 py-2 text-sm text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
            >
              <CheckCheck className="w-4 h-4" />
              Mark all read
            </button>
          )}
        </div>

        {/* Search & Filters */}
        <div className="flex gap-3">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search notifications..."
              value={filters.search}
              onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
              className="w-full pl-10 pr-4 py-2.5 bg-[#1a1f28] border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border transition-colors ${
              showFilters || activeFilterCount > 0
                ? 'bg-blue-500/20 border-blue-500/30 text-blue-400'
                : 'bg-[#1a1f28] border-white/10 text-gray-400 hover:border-white/20'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filters
            {activeFilterCount > 0 && (
              <span className="w-5 h-5 bg-blue-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="mt-4 p-4 bg-[#1a1f28] border border-white/10 rounded-xl">
            <div className="grid grid-cols-3 gap-4">
              {/* Type Filter */}
              <div>
                <label className="text-sm text-gray-400 block mb-2">Type</label>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {Object.entries(
                    ALL_TYPES.reduce((acc, type) => {
                      const cat = NOTIFICATION_TYPE_CONFIG[type].category;
                      if (!acc[cat]) acc[cat] = [];
                      acc[cat].push(type);
                      return acc;
                    }, {} as Record<string, NotificationType[]>)
                  ).map(([category, types]) => (
                    <div key={category}>
                      <div className="text-xs text-gray-500 py-1">{category}</div>
                      {types.map(type => {
                        const config = NOTIFICATION_TYPE_CONFIG[type];
                        const isSelected = filters.types.includes(type);
                        return (
                          <button
                            key={type}
                            onClick={() => setFilters(f => ({
                              ...f,
                              types: isSelected
                                ? f.types.filter(t => t !== type)
                                : [...f.types, type]
                            }))}
                            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors ${
                              isSelected
                                ? 'bg-blue-500/20 text-blue-400'
                                : 'text-gray-400 hover:bg-white/5'
                            }`}
                          >
                            <span className={config.color}>{config.icon}</span>
                            {config.label}
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>

              {/* Read Status */}
              <div>
                <label className="text-sm text-gray-400 block mb-2">Status</label>
                <div className="space-y-1">
                  {(['all', 'unread', 'read'] as const).map(status => (
                    <button
                      key={status}
                      onClick={() => setFilters(f => ({ ...f, readStatus: status }))}
                      className={`w-full px-3 py-2 rounded text-sm text-left capitalize transition-colors ${
                        filters.readStatus === status
                          ? 'bg-blue-500/20 text-blue-400'
                          : 'text-gray-400 hover:bg-white/5'
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date Range */}
              <div>
                <label className="text-sm text-gray-400 block mb-2">Date</label>
                <div className="space-y-1">
                  {[
                    { value: 'all', label: 'All time' },
                    { value: 'today', label: 'Today' },
                    { value: 'week', label: 'This week' },
                    { value: 'month', label: 'This month' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setFilters(f => ({ ...f, dateRange: opt.value as any }))}
                      className={`w-full px-3 py-2 rounded text-sm text-left transition-colors ${
                        filters.dateRange === opt.value
                          ? 'bg-blue-500/20 text-blue-400'
                          : 'text-gray-400 hover:bg-white/5'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Clear Filters */}
            {activeFilterCount > 0 && (
              <button
                onClick={() => setFilters(f => ({ ...f, types: [], readStatus: 'all', dateRange: 'all' }))}
                className="mt-4 text-sm text-gray-400 hover:text-white"
              >
                Clear all filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-center justify-between">
          <span className="text-sm text-blue-400">
            {selectedIds.size} selected
          </span>
          <div className="flex gap-2">
            <button
              onClick={handleBulkMarkRead}
              className="flex items-center gap-1 px-3 py-1.5 text-sm text-blue-400 hover:bg-blue-500/20 rounded transition-colors"
            >
              <Check className="w-4 h-4" />
              Mark read
            </button>
            <button
              onClick={handleBulkDelete}
              className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-400 hover:bg-red-500/20 rounded transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="px-3 py-1.5 text-sm text-gray-400 hover:bg-white/5 rounded transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Results */}
      {filteredNotifications.length === 0 ? (
        <div className="text-center py-12">
          <Bell className="w-12 h-12 mx-auto text-gray-600 mb-4" />
          <p className="text-gray-400">No notifications found</p>
          {activeFilterCount > 0 && (
            <button
              onClick={() => setFilters(f => ({ ...f, types: [], readStatus: 'all', dateRange: 'all', search: '' }))}
              className="mt-2 text-sm text-blue-400 hover:text-blue-300"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Select All */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleSelectAll}
              className="text-sm text-gray-400 hover:text-white"
            >
              {selectedIds.size === filteredNotifications.length ? 'Deselect all' : 'Select all'}
            </button>
            <span className="text-gray-600">•</span>
            <span className="text-sm text-gray-500">
              {filteredNotifications.length} notification{filteredNotifications.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Grouped List */}
          {Array.from(groupedNotifications.entries()).map(([group, items]) => (
            <div key={group}>
              <h3 className="text-sm font-medium text-gray-400 mb-2">{group}</h3>
              <div className="bg-[#1a1f28] rounded-xl border border-white/10 divide-y divide-white/5">
                {items.map(notification => (
                  <NotificationRow
                    key={notification.id}
                    notification={notification}
                    isSelected={selectedIds.has(notification.id)}
                    onSelect={(selected) => {
                      setSelectedIds(prev => {
                        const next = new Set(prev);
                        if (selected) next.add(notification.id);
                        else next.delete(notification.id);
                        return next;
                      });
                    }}
                    onMarkRead={() => markAsRead(notification.id)}
                    onDelete={() => deleteNotification(notification.id)}
                    onNavigate={onNavigate}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// NOTIFICATION ROW
// =============================================================================

function NotificationRow({
  notification,
  isSelected,
  onSelect,
  onMarkRead,
  onDelete,
  onNavigate,
}: {
  notification: Notification;
  isSelected: boolean;
  onSelect: (selected: boolean) => void;
  onMarkRead: () => void;
  onDelete: () => void;
  onNavigate?: (url: string) => void;
}) {
  const config = NOTIFICATION_TYPE_CONFIG[notification.type];

  return (
    <div
      className={`flex items-start gap-4 p-4 transition-colors ${
        !notification.isRead ? 'bg-white/[0.02]' : ''
      } ${isSelected ? 'bg-blue-500/10' : 'hover:bg-white/5'}`}
    >
      {/* Checkbox */}
      <input
        type="checkbox"
        checked={isSelected}
        onChange={(e) => onSelect(e.target.checked)}
        className="mt-1 w-4 h-4 rounded border-gray-600 bg-transparent text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
      />

      {/* Icon */}
      <div className={`flex-shrink-0 w-8 h-8 rounded-full bg-white/5 flex items-center justify-center ${config?.color ?? ''}`}>
        {config.icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className={`text-sm ${notification.isRead ? 'text-gray-400' : 'text-white font-medium'}`}>
              {notification.title}
            </p>
            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
              {notification.message}
            </p>
          </div>
          {!notification.isRead && (
            <span className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-1.5" />
          )}
        </div>

        <div className="flex items-center gap-3 mt-2">
          <span className="text-xs text-gray-600">
            {formatDate(notification.createdAt)}
          </span>
          <span className={`text-xs px-1.5 py-0.5 rounded ${config?.color ?? ''} bg-white/5`}>
            {config.label}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1">
        {notification.actionUrl && onNavigate && (
          <button
            onClick={() => {
              onMarkRead();
              onNavigate(notification.actionUrl!);
            }}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded transition-colors"
            title="View"
          >
            <ExternalLink className="w-4 h-4" />
          </button>
        )}
        {!notification.isRead && (
          <button
            onClick={onMarkRead}
            className="p-2 text-gray-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded transition-colors"
            title="Mark as read"
          >
            <Check className="w-4 h-4" />
          </button>
        )}
        <button
          onClick={onDelete}
          className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
          title="Delete"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
