/**
 * NotificationCenter
 * In-app notification center with bell icon and dropdown
 * 
 * v0.41.9 - Approval Notifications
 */


import React, { useState, useRef, useEffect } from 'react';
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  X,
  FileText,
  UserCheck,
  UserX,
  AlertCircle,
  MessageSquare,
  Users,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { Notification, NotificationType, useNotifications } from '@/services/notification-service';

// =============================================================================
// TYPES
// =============================================================================

export interface NotificationCenterProps {
  userId: string;
  onNavigate?: (url: string) => void;
}

// =============================================================================
// HELPERS
// =============================================================================

function getNotificationIcon(type: NotificationType) {
  switch (type) {
    case 'approval-submitted':
      return <FileText className="w-4 h-4 text-blue-400" />;
    case 'approval-assigned':
      return <UserCheck className="w-4 h-4 text-purple-400" />;
    case 'approval-approved':
      return <Check className="w-4 h-4 text-emerald-400" />;
    case 'approval-rejected':
      return <UserX className="w-4 h-4 text-red-400" />;
    case 'approval-changes-requested':
      return <AlertCircle className="w-4 h-4 text-amber-400" />;
    case 'approval-reminder':
    case 'approval-overdue':
      return <Clock className="w-4 h-4 text-amber-400" />;
    case 'mention':
      return <MessageSquare className="w-4 h-4 text-blue-400" />;
    case 'comment':
      return <MessageSquare className="w-4 h-4 text-gray-400" />;
    case 'collaboration-invite':
      return <Users className="w-4 h-4 text-purple-400" />;
    default:
      return <Bell className="w-4 h-4 text-gray-400" />;
  }
}

function getTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

function getPriorityColor(priority: Notification['priority']): string {
  switch (priority) {
    case 'urgent': return 'border-l-red-500';
    case 'high': return 'border-l-amber-500';
    case 'normal': return 'border-l-blue-500';
    default: return 'border-l-gray-500';
  }
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function NotificationCenter({ userId, onNavigate }: NotificationCenterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications(userId);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id);
    if (notification.actionUrl && onNavigate) {
      onNavigate(notification.actionUrl);
      setIsOpen(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-white/5 transition-colors"
      >
        <Bell className="w-5 h-5 text-gray-400" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-[10px] 
                           font-bold rounded-full flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-96 bg-[#1a1f28] border border-white/10 
                        rounded-xl shadow-2xl z-50 overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <div>
              <h3 className="text-white font-medium">Notifications</h3>
              {unreadCount > 0 && (
                <span className="text-xs text-gray-500">{unreadCount} unread</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                >
                  <CheckCheck className="w-3 h-3" />
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-white/5 rounded text-gray-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-[400px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No notifications</p>
              </div>
            ) : (
              notifications.map(notification => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onClick={() => handleNotificationClick(notification)}
                  onDelete={() => deleteNotification(notification.id)}
                />
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-3 border-t border-white/10 text-center">
              <button
                onClick={() => {
                  onNavigate?.('/notifications');
                  setIsOpen(false);
                }}
                className="text-sm text-blue-400 hover:text-blue-300"
              >
                View all notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// NOTIFICATION ITEM
// =============================================================================

function NotificationItem({
  notification,
  onClick,
  onDelete,
}: {
  notification: Notification;
  onClick: () => void;
  onDelete: () => void;
}) {
  const [showDelete, setShowDelete] = useState(false);

  return (
    <div
      className={`
        p-3 border-l-2 ${getPriorityColor(notification.priority)}
        ${notification.isRead ? 'bg-transparent' : 'bg-white/5'}
        hover:bg-white/5 transition-colors cursor-pointer
      `}
      onMouseEnter={() => setShowDelete(true)}
      onMouseLeave={() => setShowDelete(false)}
      onClick={onClick}
    >
      <div className="flex gap-3">
        {/* Icon */}
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
          {getNotificationIcon(notification.type)}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className={`text-sm ${notification.isRead ? 'text-gray-400' : 'text-white'} line-clamp-2`}>
              {notification.title}
            </p>
            {!notification.isRead && (
              <span className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-1.5" />
            )}
          </div>
          
          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
            {notification.message}
          </p>
          
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-[10px] text-gray-600">
              {getTimeAgo(notification.createdAt)}
            </span>
            {notification.actionUrl && (
              <span className="text-[10px] text-blue-500 flex items-center gap-0.5">
                <ExternalLink className="w-2.5 h-2.5" />
                View
              </span>
            )}
          </div>
        </div>

        {/* Delete button */}
        {showDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="flex-shrink-0 p-1 hover:bg-red-500/20 rounded text-gray-500 hover:text-red-400"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// TOAST NOTIFICATION
// =============================================================================

export function NotificationToast({
  notification,
  onClose,
  onAction,
}: {
  notification: Notification;
  onClose: () => void;
  onAction?: () => void;
}) {
  useEffect(() => {
    // Auto-close after 5 seconds
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-slide-up">
      <div className={`
        w-80 bg-[#1a1f28] border border-white/10 rounded-lg shadow-2xl
        border-l-4 ${getPriorityColor(notification.priority)}
      `}>
        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
              {getNotificationIcon(notification.type)}
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white font-medium">{notification.title}</p>
              <p className="text-xs text-gray-400 mt-0.5">{notification.message}</p>
              
              {notification.actionUrl && onAction && (
                <button
                  onClick={onAction}
                  className="mt-2 text-xs text-blue-400 hover:text-blue-300"
                >
                  View details →
                </button>
              )}
            </div>
            
            <button
              onClick={onClose}
              className="flex-shrink-0 p-1 hover:bg-white/5 rounded text-gray-500"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// NOTIFICATION BADGE (for inline use)
// =============================================================================

export function NotificationBadge({ count }: { count: number }) {
  if (count === 0) return null;
  
  return (
    <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 
                     bg-red-500 text-white text-[10px] font-bold rounded-full">
      {count > 99 ? '99+' : count}
    </span>
  );
}
