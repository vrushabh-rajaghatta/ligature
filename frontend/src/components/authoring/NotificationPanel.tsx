

import { useState } from 'react';
import { Bell, X, Check, Clock, MessageSquare, FileText, Users, AlertCircle, CheckCircle } from 'lucide-react';

interface Notification {
  id: string;
  type: 'review-request' | 'review-complete' | 'comment' | 'approval' | 'deadline' | 'system';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  actionUrl?: string;
  documentId?: string;
}

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const mockNotifications: Notification[] = [
  {
    id: 'notif-1',
    type: 'review-request',
    title: 'Review Requested',
    message: 'Jennifer Park has requested your review on CSR LIG-301 - Section 11 Efficacy',
    timestamp: '2024-12-14T10:30:00Z',
    read: false,
    documentId: 'doc-csr-301',
  },
  {
    id: 'notif-2',
    type: 'comment',
    title: 'New Comment',
    message: 'Dr. Sarah Chen commented on Protocol LIG-303: "Please clarify the inclusion criteria..."',
    timestamp: '2024-12-14T09:15:00Z',
    read: false,
    documentId: 'doc-prot-303',
  },
  {
    id: 'notif-3',
    type: 'deadline',
    title: 'Deadline Approaching',
    message: 'IB v5.0 review is due in 2 days',
    timestamp: '2024-12-14T08:00:00Z',
    read: true,
    documentId: 'doc-ib-v5',
  },
  {
    id: 'notif-4',
    type: 'approval',
    title: 'Document Approved',
    message: 'Protocol LIG-302 has been approved by Amanda Foster',
    timestamp: '2024-12-13T16:45:00Z',
    read: true,
    documentId: 'doc-prot-302',
  },
  {
    id: 'notif-5',
    type: 'review-complete',
    title: 'Review Completed',
    message: 'Maria Santos completed review of CSR LIG-301 Section 11',
    timestamp: '2024-12-13T14:20:00Z',
    read: true,
    documentId: 'doc-csr-301',
  },
];

const typeConfig = {
  'review-request': { icon: <Users className="w-4 h-4" />, color: 'text-accent-blue', bg: 'bg-accent-blue/20' },
  'review-complete': { icon: <CheckCircle className="w-4 h-4" />, color: 'text-accent-green', bg: 'bg-accent-green/20' },
  'comment': { icon: <MessageSquare className="w-4 h-4" />, color: 'text-amber-400', bg: 'bg-amber-500/20' },
  'approval': { icon: <Check className="w-4 h-4" />, color: 'text-accent-green', bg: 'bg-accent-green/20' },
  'deadline': { icon: <Clock className="w-4 h-4" />, color: 'text-red-400', bg: 'bg-red-500/20' },
  'system': { icon: <AlertCircle className="w-4 h-4" />, color: 'text-text-muted', bg: 'bg-surface-card' },
};

export function NotificationPanel({ isOpen, onClose }: NotificationPanelProps) {
  const [notifications, setNotifications] = useState(mockNotifications);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  };

  if (!isOpen) return null;

  return (
    <div className="absolute right-0 top-12 w-96 bg-surface-elevated border border-border rounded-lg shadow-xl z-50">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-text-muted" />
          <span className="text-sm font-semibold text-text-primary">Notifications</span>
          {unreadCount > 0 && (
            <span className="text-xs px-1.5 py-0.5 bg-accent-blue text-white rounded-full">{unreadCount}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button onClick={markAllAsRead} className="text-xs text-accent-blue hover:underline">
              Mark all read
            </button>
          )}
          <button onClick={onClose} className="p-1 hover:bg-surface-card rounded">
            <X className="w-4 h-4 text-text-muted" />
          </button>
        </div>
      </div>

      <div className="max-h-96 overflow-auto">
        {notifications.length > 0 ? (
          notifications.map(notif => {
            const config = typeConfig[notif.type];
            return (
              <div
                key={notif.id}
                onClick={() => markAsRead(notif.id)}
                className={`px-4 py-3 border-b border-border hover:bg-surface-card cursor-pointer transition-colors ${
                  !notif.read ? 'bg-accent-blue/5' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-1.5 rounded ${config?.bg ?? ''}`}>
                    <span className={config.color}>{config.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-text-primary">{notif.title}</span>
                      {!notif.read && <div className="w-2 h-2 bg-accent-blue rounded-full" />}
                    </div>
                    <p className="text-xs text-text-muted line-clamp-2">{notif.message}</p>
                    <span className="text-xs text-text-muted mt-1 block">{formatTime(notif.timestamp)}</span>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="px-4 py-8 text-center">
            <Bell className="w-8 h-8 text-text-muted mx-auto mb-2" />
            <p className="text-sm text-text-muted">No notifications</p>
          </div>
        )}
      </div>

      <div className="px-4 py-2 border-t border-border">
        <button className="w-full text-xs text-accent-blue hover:underline text-center">
          View all notifications →
        </button>
      </div>
    </div>
  );
}

// Notification bell button for header
export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const unreadCount = 2; // Mock unread count

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 hover:bg-surface-card rounded-lg relative"
      >
        <Bell className="w-5 h-5 text-text-muted" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-accent-blue text-white text-xs rounded-full flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>
      <NotificationPanel isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </div>
  );
}
