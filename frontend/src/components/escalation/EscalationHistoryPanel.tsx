
/**
 * Escalation History Panel - v0.13.95
 * Timeline display of escalation events, notifications, and resolutions
 */


import React, { useState, useMemo } from 'react';
import {
  History,
  Bell,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowUpRight,
  User,
  Mail,
  MessageSquare,
  X,
  Filter,
  Search,
  ChevronDown,
  ChevronRight,
  FileText,
  Shield,
  AlertCircle,
  CheckCheck,
  XCircle,
  RefreshCw,
} from 'lucide-react';
import { useEscalationRulesStore } from '@/store/useEscalationRulesStore';
import {
  EscalationHistoryEntry,
  EscalationInstance,
  EscalationNotification,
  ModuleScope,
} from '@/store/escalationRulesTypes';

// =============================================================================
// CONSTANTS
// =============================================================================

const ACTION_ICONS: Record<string, React.ReactNode> = {
  triggered: <AlertTriangle className="w-4 h-4" />,
  'tier-escalated': <ArrowUpRight className="w-4 h-4" />,
  'notification-sent': <Bell className="w-4 h-4" />,
  acknowledged: <CheckCheck className="w-4 h-4" />,
  resolved: <CheckCircle2 className="w-4 h-4" />,
  'auto-reassigned': <RefreshCw className="w-4 h-4" />,
};

const ACTION_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  triggered: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300' },
  'tier-escalated': { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-300' },
  'notification-sent': { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300' },
  acknowledged: { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-300' },
  resolved: { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-300' },
  'auto-reassigned': { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-300' },
};

const MODULE_LABELS: Record<ModuleScope, string> = {
  haq: 'HAQ',
  tmf: 'TMF',
  ctms: 'CTMS',
  safety: 'Safety',
  regulatory: 'Regulatory',
  qms: 'QMS',
  'document-control': 'Doc Control',
  submissions: 'Submissions',
  all: 'All',
};

// =============================================================================
// HISTORY ENTRY COMPONENT
// =============================================================================

interface HistoryEntryItemProps {
  entry: EscalationHistoryEntry;
  isFirst: boolean;
  isLast: boolean;
}

const HistoryEntryItem: React.FC<HistoryEntryItemProps> = ({ entry, isFirst, isLast }) => {
  const [expanded, setExpanded] = useState(false);
  const colors = ACTION_COLORS[entry.action] || ACTION_COLORS.triggered;
  const icon = ACTION_ICONS[entry.action] || <AlertCircle className="w-4 h-4" />;

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div className="relative flex gap-4">
      {/* Timeline connector */}
      <div className="flex flex-col items-center">
        <div className={`w-8 h-8 rounded-full ${colors?.bg ?? ''} ${colors?.text ?? ''} flex items-center justify-center z-10`}>
          {icon}
        </div>
        {!isLast && (
          <div className="w-0.5 flex-1 bg-slate-200 -mt-1" />
        )}
      </div>

      {/* Content */}
      <div className={`flex-1 ${!isLast ? 'pb-6' : ''}`}>
        <div className="flex items-start justify-between mb-1">
          <div>
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colors?.bg ?? ''} ${colors?.text ?? ''}`}>
              {entry.action.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
            </span>
            {entry.tier && (
              <span className="ml-2 text-xs text-slate-500">Tier {entry.tier}</span>
            )}
          </div>
          <div className="text-xs text-slate-500">
            {formatDate(entry.timestamp)} · {formatTime(entry.timestamp)}
          </div>
        </div>

        <p className="text-sm text-slate-700 mb-1">{entry.details}</p>
        
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <FileText className="w-3 h-3" />
            {entry.ruleName}
          </span>
          {entry.performedBy && (
            <span className="flex items-center gap-1">
              <User className="w-3 h-3" />
              {entry.performedBy}
            </span>
          )}
        </div>

        {entry.metadata && Object.keys(entry.metadata).length > 0 && (
          <button
            className="mt-2 text-xs text-blue-600 hover:underline flex items-center gap-1"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            {expanded ? 'Hide details' : 'Show details'}
          </button>
        )}

        {expanded && entry.metadata && (
          <div className="mt-2 p-2 bg-slate-50 rounded text-xs font-mono text-slate-600">
            {Object.entries(entry.metadata).map(([key, value]) => (
              <div key={key}>
                <span className="text-slate-400">{key}:</span> {JSON.stringify(value)}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// =============================================================================
// NOTIFICATION LIST COMPONENT
// =============================================================================

interface NotificationListProps {
  notifications: EscalationNotification[];
  onAcknowledge: (notificationId: string) => void;
}

const NotificationList: React.FC<NotificationListProps> = ({ notifications, onAcknowledge }) => {
  if (notifications.length === 0) {
    return (
      <div className="text-center py-6 text-slate-500 text-sm">
        No notifications sent yet
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`p-3 rounded-lg border ${
            notification.acknowledged
              ? 'bg-slate-50 border-slate-200'
              : 'bg-blue-50 border-blue-200'
          }`}
        >
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              {notification.channel === 'email' && <Mail className="w-4 h-4 text-blue-600" />}
              {notification.channel === 'slack' && <MessageSquare className="w-4 h-4 text-purple-600" />}
              {notification.channel === 'in-app' && <Bell className="w-4 h-4 text-amber-600" />}
              <span className="text-sm font-medium text-slate-700">
                {notification.recipientName}
              </span>
              <span className="text-xs text-slate-500 capitalize">
                ({notification.recipientType})
              </span>
            </div>
            <span className="text-xs text-slate-500">
              Tier {notification.tier}
            </span>
          </div>

          <p className="text-sm text-slate-600 mb-2">{notification.messageContent}</p>

          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Sent: {new Date(notification.sentAt).toLocaleString()}
            </span>
            {notification.acknowledged ? (
              <span className="text-xs text-emerald-600 flex items-center gap-1">
                <CheckCheck className="w-3 h-3" />
                Acknowledged {notification.acknowledgedAt && `at ${new Date(notification.acknowledgedAt).toLocaleTimeString()}`}
              </span>
            ) : (
              <button
                className="text-xs text-blue-600 hover:underline"
                onClick={() => onAcknowledge(notification.id)}
              >
                Mark Acknowledged
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

// =============================================================================
// ACTIVE INSTANCE CARD
// =============================================================================

interface ActiveInstanceCardProps {
  instance: EscalationInstance;
  onAcknowledge: () => void;
  onResolve: () => void;
  onEscalate: () => void;
}

const ActiveInstanceCard: React.FC<ActiveInstanceCardProps> = ({
  instance,
  onAcknowledge,
  onResolve,
  onEscalate,
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const { acknowledgeNotification } = useEscalationRulesStore();

  const statusColors = {
    triggered: 'bg-red-100 text-red-700 border-red-300',
    acknowledged: 'bg-blue-100 text-blue-700 border-blue-300',
    resolved: 'bg-emerald-100 text-emerald-700 border-emerald-300',
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h4 className="font-medium text-slate-900">{instance.sourceItemName}</h4>
            <p className="text-sm text-slate-500">
              {MODULE_LABELS[instance.sourceModule]} · {instance.sourceItemType}
            </p>
          </div>
          <span className={`px-2 py-0.5 rounded text-xs font-medium border ${statusColors[instance.status as keyof typeof statusColors] || 'bg-slate-100 text-slate-700'}`}>
            {instance.status.charAt(0).toUpperCase() + instance.status.slice(1)}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
          <div>
            <span className="text-slate-500 block text-xs">Current Tier</span>
            <span className="font-medium text-slate-900">Tier {instance.currentTier}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-xs">Hours Overdue</span>
            <span className="font-medium text-red-600">{instance.hoursOverdue.toFixed(1)}h</span>
          </div>
          <div>
            <span className="text-slate-500 block text-xs">Notifications</span>
            <span className="font-medium text-slate-900">{instance.notificationsSent.length}</span>
          </div>
        </div>

        <div className="text-xs text-slate-500 mb-4">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Triggered: {new Date(instance.triggeredAt).toLocaleString()}
          </span>
          {instance.nextEscalationAt && (
            <span className="flex items-center gap-1 mt-1">
              <ArrowUpRight className="w-3 h-3" />
              Next escalation: {new Date(instance.nextEscalationAt).toLocaleString()}
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {instance.status === 'triggered' && (
            <button
              className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
              onClick={onAcknowledge}
            >
              Acknowledge
            </button>
          )}
          {(instance.status === 'triggered' || instance.status === 'acknowledged') && (
            <>
              <button
                className="flex-1 px-3 py-2 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700"
                onClick={onResolve}
              >
                Resolve
              </button>
              <button
                className="px-3 py-2 border border-slate-200 text-slate-700 text-sm rounded-lg hover:bg-slate-50"
                onClick={onEscalate}
              >
                Escalate
              </button>
            </>
          )}
        </div>
      </div>

      {/* Notifications toggle */}
      <div className="border-t border-slate-100">
        <button
          className="w-full px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 flex items-center justify-between"
          onClick={() => setShowNotifications(!showNotifications)}
        >
          <span className="flex items-center gap-2">
            <Bell className="w-4 h-4" />
            Notifications ({instance.notificationsSent.length})
          </span>
          {showNotifications ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>

        {showNotifications && (
          <div className="px-4 pb-4">
            <NotificationList
              notifications={instance.notificationsSent}
              onAcknowledge={(notificationId) => acknowledgeNotification(instance.id, notificationId)}
            />
          </div>
        )}
      </div>
    </div>
  );
};

// =============================================================================
// RESOLVE MODAL
// =============================================================================

interface ResolveModalProps {
  instance: EscalationInstance;
  onResolve: (notes: string) => void;
  onClose: () => void;
}

const ResolveModal: React.FC<ResolveModalProps> = ({ instance, onResolve, onClose }) => {
  const [notes, setNotes] = useState('');

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Resolve Escalation</h2>
          <button className="p-2 hover:bg-slate-100 rounded-lg" onClick={onClose}>
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="p-6">
          <div className="mb-4">
            <p className="text-sm text-slate-600">
              Resolving escalation for <strong>{instance.sourceItemName}</strong>
            </p>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Resolution Notes
            </label>
            <textarea
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={4}
              placeholder="Describe how this was resolved..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="flex gap-3">
            <button
              className="flex-1 px-4 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
              onClick={() => {
                onResolve(notes);
                onClose();
              }}
            >
              Resolve
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// MAIN PANEL COMPONENT
// =============================================================================

interface EscalationHistoryPanelProps {
  ruleId?: string;
  instanceId?: string;
  showActiveInstances?: boolean;
}

export const EscalationHistoryPanel: React.FC<EscalationHistoryPanelProps> = ({
  ruleId,
  instanceId,
  showActiveInstances = true,
}) => {
  const {
    history,
    activeInstances,
    getHistoryForRule,
    getHistoryForInstance,
    acknowledgeEscalation,
    resolveEscalation,
    escalateToNextTier,
  } = useEscalationRulesStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [resolveModalInstance, setResolveModalInstance] = useState<EscalationInstance | null>(null);

  // Get filtered history
  const filteredHistory = useMemo(() => {
    let entries: EscalationHistoryEntry[] = [];

    if (instanceId) {
      entries = getHistoryForInstance(instanceId);
    } else if (ruleId) {
      entries = getHistoryForRule(ruleId);
    } else {
      entries = history;
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      entries = entries.filter(
        (e) =>
          e.details.toLowerCase().includes(query) ||
          e.ruleName.toLowerCase().includes(query)
      );
    }

    // Apply action filter
    if (actionFilter !== 'all') {
      entries = entries.filter((e) => e.action === actionFilter);
    }

    // Sort by timestamp descending
    return [...entries].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [history, ruleId, instanceId, searchQuery, actionFilter, getHistoryForRule, getHistoryForInstance]);

  // Get active instances for display
  const relevantInstances = useMemo(() => {
    if (!showActiveInstances) return [];
    if (ruleId) {
      return activeInstances.filter((i) => i.ruleId === ruleId && i.status !== 'resolved');
    }
    return activeInstances.filter((i) => i.status !== 'resolved');
  }, [activeInstances, ruleId, showActiveInstances]);

  const handleAcknowledge = (instance: EscalationInstance) => {
    acknowledgeEscalation(instance.id, 'current-user');
  };

  const handleResolve = (instance: EscalationInstance, notes: string) => {
    resolveEscalation(instance.id, 'current-user', notes);
  };

  const handleEscalate = (instance: EscalationInstance) => {
    escalateToNextTier(instance.id);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-200">
        <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
          <History className="w-5 h-5 text-slate-600" />
          Escalation History
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Track escalation events, notifications, and resolutions
        </p>
      </div>

      {/* Active Instances */}
      {showActiveInstances && relevantInstances.length > 0 && (
        <div className="px-6 py-4 border-b border-slate-200 bg-amber-50/50">
          <h3 className="text-sm font-medium text-slate-900 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            Active Escalations ({relevantInstances.length})
          </h3>
          <div className="space-y-3">
            {relevantInstances.map((instance) => (
              <ActiveInstanceCard
                key={instance.id}
                instance={instance}
                onAcknowledge={() => handleAcknowledge(instance)}
                onResolve={() => setResolveModalInstance(instance)}
                onEscalate={() => handleEscalate(instance)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="px-6 py-3 border-b border-slate-100 flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search history..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Actions</option>
          <option value="triggered">Triggered</option>
          <option value="tier-escalated">Tier Escalated</option>
          <option value="notification-sent">Notification Sent</option>
          <option value="acknowledged">Acknowledged</option>
          <option value="resolved">Resolved</option>
          <option value="auto-reassigned">Auto-Reassigned</option>
        </select>
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-y-auto p-6">
        {filteredHistory.length === 0 ? (
          <div className="text-center py-12">
            <History className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">No history yet</h3>
            <p className="text-slate-500 text-sm">
              Escalation events will appear here as they occur
            </p>
          </div>
        ) : (
          <div className="space-y-0">
            {filteredHistory.map((entry, index) => (
              <HistoryEntryItem
                key={entry.id}
                entry={entry}
                isFirst={index === 0}
                isLast={index === filteredHistory.length - 1}
              />
            ))}
          </div>
        )}
      </div>

      {/* Resolve Modal */}
      {resolveModalInstance && (
        <ResolveModal
          instance={resolveModalInstance}
          onResolve={(notes) => handleResolve(resolveModalInstance, notes)}
          onClose={() => setResolveModalInstance(null)}
        />
      )}
    </div>
  );
};

export default EscalationHistoryPanel;
