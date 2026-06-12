

import { useState, useEffect, createContext, useContext, useCallback, useMemo } from 'react';
import {
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  Info,
  X,
  Bell,
  MessageSquare,
  FileText,
  Sparkles,
  Shield,
  Send,
  Users,
  Clock,
  Filter,
  Settings,
  Archive,
  Trash2,
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import { 
  useNotificationStore, 
  useUnreadCount,
  PlatformNotification,
  NotificationCategory,
  NotificationPriority
} from '@/store/useNotificationStore';
import { useAppStore } from '@/store/useAppStore';
import { useShallow } from 'zustand/react/shallow';

// ============================================================================
// TOAST NOTIFICATION SYSTEM (immediate feedback)
// ============================================================================

export type NotificationType = 'success' | 'warning' | 'error' | 'info';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface NotificationContextType {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  removeNotification: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = useCallback((notification: Omit<Notification, 'id'>) => {
    const id = `notif-${Date.now()}`;
    const newNotification = { ...notification, id };
    setNotifications(prev => [...prev, newNotification]);

    // Auto remove after duration
    const duration = notification.duration ?? 5000;
    if (duration > 0) {
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== id));
      }, duration);
    }
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  return (
    <NotificationContext.Provider value={{ notifications, addNotification, removeNotification }}>
      {children}
      <NotificationContainer />
    </NotificationContext.Provider>
  );
}

function NotificationContainer() {
  const { notifications, removeNotification } = useNotifications();

  const getIcon = (type: NotificationType) => {
    switch (type) {
      case 'success': return <CheckCircle className="w-5 h-5 text-accent-green" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-accent-amber" />;
      case 'error': return <AlertCircle className="w-5 h-5 text-accent-red" />;
      case 'info': return <Info className="w-5 h-5 text-accent-blue" />;
    }
  };

  const getBorderColor = (type: NotificationType) => {
    switch (type) {
      case 'success': return 'border-l-accent-green';
      case 'warning': return 'border-l-accent-amber';
      case 'error': return 'border-l-accent-red';
      case 'info': return 'border-l-accent-blue';
    }
  };

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[100] space-y-2 max-w-sm">
      {notifications.map(notification => (
        <div
          key={notification.id}
          className={`bg-surface-elevated border border-border border-l-4 ${getBorderColor(notification.type)} rounded-lg shadow-xl p-4 animate-slide-in`}
        >
          <div className="flex items-start gap-3">
            {getIcon(notification.type)}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-text-primary">{notification.title}</div>
              {notification.message && (
                <div className="text-xs text-text-muted mt-1">{notification.message}</div>
              )}
              {notification.action && (
                <button
                  onClick={notification.action.onClick}
                  className="text-xs text-accent-blue hover:underline mt-2"
                >
                  {notification.action.label}
                </button>
              )}
            </div>
            <button
              onClick={() => removeNotification(notification.id)}
              className="p-1 hover:bg-surface-card rounded text-text-muted"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// NOTIFICATION BELL WITH REAL DATA
// ============================================================================

const categoryIcons: Record<NotificationCategory, React.ReactNode> = {
  review: <Users className="w-4 h-4" />,
  comment: <MessageSquare className="w-4 h-4" />,
  haq: <Clock className="w-4 h-4" />,
  document: <FileText className="w-4 h-4" />,
  ai: <Sparkles className="w-4 h-4" />,
  safety: <Shield className="w-4 h-4" />,
  submission: <Send className="w-4 h-4" />,
  system: <Settings className="w-4 h-4" />,
};

const categoryColors: Record<NotificationCategory, string> = {
  review: 'text-purple-400',
  comment: 'text-blue-400',
  haq: 'text-amber-400',
  document: 'text-green-400',
  ai: 'text-cyan-400',
  safety: 'text-red-400',
  submission: 'text-indigo-400',
  system: 'text-slate-400',
};

const priorityStyles: Record<NotificationPriority, { bg: string; text: string }> = {
  critical: { bg: 'bg-red-500/20', text: 'text-red-400' },
  high: { bg: 'bg-amber-500/20', text: 'text-amber-400' },
  normal: { bg: 'bg-slate-500/20', text: 'text-slate-400' },
  low: { bg: 'bg-slate-500/10', text: 'text-slate-500' },
};

function formatTimeAgo(timestamp: string): string {
  const now = new Date();
  const then = new Date(timestamp);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return then.toLocaleDateString();
}

type ViewMode = 'list' | 'settings';
type FilterMode = 'all' | NotificationCategory;

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  
  const setActiveModule = useAppStore((s) => s.setActiveModule);
  
  // v204d-b27: Use useShallow for array/object selectors to prevent infinite loops during hydration
  const notifications = useNotificationStore(useShallow(s => s.notifications));
  const preferences = useNotificationStore(useShallow(s => s.preferences));
  const markAsRead = useNotificationStore(s => s.markAsRead);
  const markAllAsRead = useNotificationStore(s => s.markAllAsRead);
  const archiveNotification = useNotificationStore(s => s.archiveNotification);
  const deleteNotification = useNotificationStore(s => s.deleteNotification);
  const updatePreferences = useNotificationStore(s => s.updatePreferences);
  
  const unreadCount = useUnreadCount();

  // Filter notifications
  const filteredNotifications = useMemo(() => {
    let items = notifications.filter(n => n.status !== 'archived');
    if (filterMode !== 'all') {
      items = items.filter(n => n.category === filterMode);
    }
    return items.slice(0, 50); // Show last 50
  }, [notifications, filterMode]);

  const handleNotificationClick = (notification: PlatformNotification) => {
    markAsRead(notification.id);
    
    // Navigate if action target exists
    if (notification.actionTarget) {
      setActiveModule(notification.actionTarget as any);
      setIsOpen(false);
    }
  };

  const handleToggleCategory = (category: NotificationCategory) => {
    const current = preferences.enabledCategories;
    const updated = current.includes(category)
      ? current.filter(c => c !== category)
      : [...current, category];
    updatePreferences({ enabledCategories: updated });
  };

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 hover:bg-surface-card rounded-lg transition-colors relative"
      >
        <Bell className="w-5 h-5 text-text-secondary" />
        {unreadCount > 0 && (
          <span className="absolute top-0.5 right-0.5 min-w-[18px] h-[18px] bg-accent-red rounded-full text-[10px] text-white flex items-center justify-center font-medium px-1">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full right-0 mt-2 w-96 bg-surface-elevated border border-border rounded-xl shadow-2xl z-50 overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-border">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Bell className="w-5 h-5 text-text-primary" />
                  <span className="text-sm font-semibold text-text-primary">Notifications</span>
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 text-xs bg-accent-blue/20 text-accent-blue rounded-full">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => setViewMode(viewMode === 'list' ? 'settings' : 'list')}
                    className={`p-1.5 rounded-lg transition-colors ${
                      viewMode === 'settings' 
                        ? 'bg-accent-blue/20 text-accent-blue' 
                        : 'hover:bg-surface-card text-text-muted'
                    }`}
                    title="Settings"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {viewMode === 'list' && (
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button 
                      onClick={markAllAsRead}
                      className="text-xs text-accent-blue hover:underline"
                    >
                      Mark all read
                    </button>
                  )}
                  <div className="flex-1" />
                  <select
                    value={filterMode}
                    onChange={(e) => setFilterMode(e.target.value as FilterMode)}
                    className="text-xs bg-surface-card border border-border rounded px-2 py-1 text-text-secondary"
                  >
                    <option value="all">All Categories</option>
                    <option value="review">Reviews</option>
                    <option value="comment">Comments</option>
                    <option value="haq">HAQ</option>
                    <option value="document">Documents</option>
                    <option value="ai">AI</option>
                    <option value="safety">Safety</option>
                    <option value="submission">Submissions</option>
                  </select>
                </div>
              )}
            </div>
            
            {/* Content */}
            {viewMode === 'list' ? (
              <div className="max-h-[400px] overflow-auto">
                {filteredNotifications.length > 0 ? (
                  filteredNotifications.map(notification => (
                    <div 
                      key={notification.id}
                      className={`group p-3 border-b border-border/50 hover:bg-surface-card cursor-pointer transition-colors ${
                        notification.status === 'unread' ? 'bg-accent-blue/5' : ''
                      }`}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`mt-0.5 ${categoryColors[notification.category]}`}>
                          {categoryIcons[notification.category]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="text-sm font-medium text-text-primary">{notification.title}</div>
                            {notification.priority === 'critical' && (
                              <span className="px-1.5 py-0.5 text-[10px] bg-red-500/20 text-red-400 rounded font-medium shrink-0">
                                URGENT
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-text-muted mt-0.5 line-clamp-2">{notification.message}</div>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className="text-[10px] text-text-muted">{formatTimeAgo(notification.timestamp)}</span>
                            {notification.actionLabel && (
                              <>
                                <span className="text-text-muted">•</span>
                                <span className="text-[10px] text-accent-blue flex items-center gap-0.5">
                                  {notification.actionLabel}
                                  <ChevronRight className="w-3 h-3" />
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col gap-1 shrink-0">
                          {notification.status === 'unread' && (
                            <div className="w-2 h-2 bg-accent-blue rounded-full" />
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              archiveNotification(notification.id);
                            }}
                            className="p-1 hover:bg-surface rounded text-text-muted opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Archive"
                          >
                            <Archive className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center">
                    <Bell className="w-10 h-10 text-text-muted mx-auto mb-3 opacity-50" />
                    <p className="text-sm text-text-muted">No notifications</p>
                    <p className="text-xs text-text-muted mt-1">
                      {filterMode !== 'all' ? 'Try changing the filter' : 'You\'re all caught up!'}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              /* Settings View */
              <div className="p-4 max-h-[400px] overflow-auto">
                <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
                  Notification Categories
                </h3>
                <div className="space-y-2">
                  {(Object.keys(categoryIcons) as NotificationCategory[]).map(category => (
                    <label
                      key={category}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-card cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={preferences.enabledCategories.includes(category)}
                        onChange={() => handleToggleCategory(category)}
                        className="w-4 h-4 rounded border-border bg-surface text-accent-blue focus:ring-accent-blue/50"
                      />
                      <span className={categoryColors[category]}>
                        {categoryIcons[category]}
                      </span>
                      <span className="text-sm text-text-primary capitalize">{category}</span>
                    </label>
                  ))}
                </div>

                <div className="border-t border-border mt-4 pt-4">
                  <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
                    Preferences
                  </h3>
                  <label className="flex items-center justify-between p-2 rounded-lg hover:bg-surface-card cursor-pointer">
                    <span className="text-sm text-text-primary">Group similar notifications</span>
                    <input
                      type="checkbox"
                      checked={preferences.groupSimilar}
                      onChange={(e) => updatePreferences({ groupSimilar: e.target.checked })}
                      className="w-4 h-4 rounded border-border bg-surface text-accent-blue focus:ring-accent-blue/50"
                    />
                  </label>
                  <label className="flex items-center justify-between p-2 rounded-lg hover:bg-surface-card cursor-pointer">
                    <span className="text-sm text-text-primary">Sound alerts</span>
                    <input
                      type="checkbox"
                      checked={preferences.enableSound}
                      onChange={(e) => updatePreferences({ enableSound: e.target.checked })}
                      className="w-4 h-4 rounded border-border bg-surface text-accent-blue focus:ring-accent-blue/50"
                    />
                  </label>
                </div>
              </div>
            )}
            
            {/* Footer */}
            {viewMode === 'list' && filteredNotifications.length > 0 && (
              <div className="p-3 border-t border-border bg-surface-card/50">
                <button className="w-full text-center text-sm text-accent-blue hover:underline flex items-center justify-center gap-1">
                  View all notifications
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// Export alias for backward compatibility
export { NotificationBell as NotificationBellLegacy };
