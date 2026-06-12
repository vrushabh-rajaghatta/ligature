/**
 * NotificationPreferences
 * Settings page for notification preferences
 * 
 * v0.42.1 - Notification Preferences UI
 */


import React, { useState, useEffect } from 'react';
import {
  Bell,
  Mail,
  Smartphone,
  Volume2,
  VolumeX,
  Clock,
  Check,
  X,
  ChevronRight,
  Save,
  RefreshCw,
  Info,
} from 'lucide-react';
import { NotificationPreferences as NotificationPreferencesType } from '@/services/notification-service';
import { usePushNotifications } from '@/services/push-notification-service';
import { PreferencesStore } from '@/services/indexeddb-service';

// =============================================================================
// TYPES
// =============================================================================

export interface NotificationPreferencesPageProps {
  userId: string;
  onSave?: (preferences: NotificationPreferencesType) => void;
}

type NotificationChannel = 'in-app' | 'email' | 'both' | 'none';

interface NotificationCategory {
  id: string;
  name: string;
  description: string;
  types: {
    id: string;
    name: string;
    description: string;
    defaultChannel: NotificationChannel;
  }[];
}

// =============================================================================
// NOTIFICATION CATEGORIES
// =============================================================================

const NOTIFICATION_CATEGORIES: NotificationCategory[] = [
  {
    id: 'approvals',
    name: 'Approvals',
    description: 'Template version approval workflow',
    types: [
      {
        id: 'approvalSubmitted',
        name: 'Submission notifications',
        description: 'When a version is submitted for your review',
        defaultChannel: 'both',
      },
      {
        id: 'approvalAssigned',
        name: 'Review assignments',
        description: 'When you are assigned as a reviewer',
        defaultChannel: 'both',
      },
      {
        id: 'approvalDecision',
        name: 'Decision notifications',
        description: 'When your submission is approved or rejected',
        defaultChannel: 'both',
      },
      {
        id: 'approvalReminder',
        name: 'Review reminders',
        description: 'Reminders for pending reviews',
        defaultChannel: 'email',
      },
    ],
  },
  {
    id: 'collaboration',
    name: 'Collaboration',
    description: 'Document collaboration and comments',
    types: [
      {
        id: 'mentions',
        name: 'Mentions',
        description: 'When someone mentions you in a comment',
        defaultChannel: 'both',
      },
      {
        id: 'comments',
        name: 'Comments',
        description: 'New comments on documents you follow',
        defaultChannel: 'in-app',
      },
      {
        id: 'collaborationInvite',
        name: 'Collaboration invites',
        description: 'Invitations to collaborate on documents',
        defaultChannel: 'both',
      },
    ],
  },
  {
    id: 'documents',
    name: 'Documents',
    description: 'Document updates and changes',
    types: [
      {
        id: 'documentUpdates',
        name: 'Document updates',
        description: 'Changes to documents you follow',
        defaultChannel: 'in-app',
      },
      {
        id: 'documentShared',
        name: 'Shared with you',
        description: 'When documents are shared with you',
        defaultChannel: 'both',
      },
    ],
  },
];

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function NotificationPreferencesPage({
  userId,
  onSave,
}: NotificationPreferencesPageProps) {
  const [preferences, setPreferences] = useState<Record<string, NotificationChannel>>({});
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [emailDigest, setEmailDigest] = useState<'immediate' | 'daily' | 'weekly' | 'none'>('immediate');
  const [quietHoursEnabled, setQuietHoursEnabled] = useState(false);
  const [quietHoursStart, setQuietHoursStart] = useState('22:00');
  const [quietHoursEnd, setQuietHoursEnd] = useState('08:00');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const { 
    isSupported: pushSupported, 
    isSubscribed: pushSubscribed,
    permission: pushPermission,
    subscribe: subscribePush,
    unsubscribe: unsubscribePush,
  } = usePushNotifications();

  // Load preferences
  useEffect(() => {
    loadPreferences();
  }, [userId]);

  const loadPreferences = async () => {
    setIsLoading(true);
    try {
      const saved = await PreferencesStore.get<Record<string, any>>(`notification-prefs-${userId}`);
      
      if (saved) {
        setPreferences(saved.channels || {});
        setEmailEnabled(saved.emailEnabled ?? true);
        setEmailDigest(saved.emailDigest || 'immediate');
        setQuietHoursEnabled(saved.quietHoursEnabled ?? false);
        setQuietHoursStart(saved.quietHoursStart || '22:00');
        setQuietHoursEnd(saved.quietHoursEnd || '08:00');
        setSoundEnabled(saved.soundEnabled ?? true);
      } else {
        // Set defaults
        const defaults: Record<string, NotificationChannel> = {};
        NOTIFICATION_CATEGORIES.forEach(cat => {
          cat.types.forEach(type => {
            defaults[type.id] = type.defaultChannel;
          });
        });
        setPreferences(defaults);
      }
    } catch (error) {
      console.error('Failed to load preferences:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const savePreferences = async () => {
    setIsSaving(true);
    try {
      const prefs = {
        channels: preferences,
        emailEnabled,
        emailDigest,
        quietHoursEnabled,
        quietHoursStart,
        quietHoursEnd,
        soundEnabled,
        updatedAt: Date.now(),
      };
      
      await PreferencesStore.set(`notification-prefs-${userId}`, prefs);
      setHasChanges(false);
      onSave?.(prefs as any);
    } catch (error) {
      console.error('Failed to save preferences:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const updatePreference = (typeId: string, channel: NotificationChannel) => {
    setPreferences(prev => ({ ...prev, [typeId]: channel }));
    setHasChanges(true);
  };

  const setAllInCategory = (categoryId: string, channel: NotificationChannel) => {
    const category = NOTIFICATION_CATEGORIES.find(c => c.id === categoryId);
    if (!category) return;
    
    setPreferences(prev => {
      const updated = { ...prev };
      category.types.forEach(type => {
        updated[type.id] = channel;
      });
      return updated;
    });
    setHasChanges(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <RefreshCw className="w-6 h-6 text-gray-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-white mb-2">Notification Settings</h1>
        <p className="text-gray-400">
          Choose how and when you want to receive notifications
        </p>
      </div>

      {/* Push Notifications */}
      <section className="mb-8 bg-[#1a1f28] rounded-xl border border-white/10 overflow-hidden">
        <div className="p-4 border-b border-white/10">
          <h2 className="text-lg font-medium text-white flex items-center gap-2">
            <Smartphone className="w-5 h-5" />
            Push Notifications
          </h2>
        </div>
        <div className="p-4">
          {!pushSupported ? (
            <div className="flex items-center gap-3 text-gray-400">
              <Info className="w-5 h-5" />
              <span>Push notifications are not supported in this browser</span>
            </div>
          ) : pushPermission === 'denied' ? (
            <div className="flex items-center gap-3 text-amber-400">
              <X className="w-5 h-5" />
              <span>Push notifications are blocked. Enable in browser settings.</span>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <div className="text-white font-medium">
                  {pushSubscribed ? 'Push notifications enabled' : 'Enable push notifications'}
                </div>
                <div className="text-sm text-gray-400">
                  Receive notifications even when the app is closed
                </div>
              </div>
              <button
                onClick={() => pushSubscribed ? unsubscribePush() : subscribePush()}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  pushSubscribed
                    ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {pushSubscribed ? 'Enabled' : 'Enable'}
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Email Settings */}
      <section className="mb-8 bg-[#1a1f28] rounded-xl border border-white/10 overflow-hidden">
        <div className="p-4 border-b border-white/10">
          <h2 className="text-lg font-medium text-white flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Email Notifications
          </h2>
        </div>
        <div className="p-4 space-y-4">
          {/* Email toggle */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-white font-medium">Email notifications</div>
              <div className="text-sm text-gray-400">Receive notifications via email</div>
            </div>
            <Toggle enabled={emailEnabled} onChange={(v) => { setEmailEnabled(v); setHasChanges(true); }} />
          </div>

          {/* Email digest */}
          {emailEnabled && (
            <div className="pt-4 border-t border-white/5">
              <div className="text-white font-medium mb-3">Email frequency</div>
              <div className="grid grid-cols-4 gap-2">
                {(['immediate', 'daily', 'weekly', 'none'] as const).map(option => (
                  <button
                    key={option}
                    onClick={() => { setEmailDigest(option); setHasChanges(true); }}
                    className={`px-3 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
                      emailDigest === option
                        ? 'bg-blue-600 text-white'
                        : 'bg-white/5 text-gray-400 hover:bg-white/10'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Quiet Hours */}
      <section className="mb-8 bg-[#1a1f28] rounded-xl border border-white/10 overflow-hidden">
        <div className="p-4 border-b border-white/10">
          <h2 className="text-lg font-medium text-white flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Quiet Hours
          </h2>
        </div>
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-white font-medium">Enable quiet hours</div>
              <div className="text-sm text-gray-400">Pause notifications during specified hours</div>
            </div>
            <Toggle enabled={quietHoursEnabled} onChange={(v) => { setQuietHoursEnabled(v); setHasChanges(true); }} />
          </div>

          {quietHoursEnabled && (
            <div className="flex items-center gap-4 pt-4 border-t border-white/5">
              <div>
                <label className="text-sm text-gray-400 block mb-1">Start</label>
                <input
                  type="time"
                  value={quietHoursStart}
                  onChange={(e) => { setQuietHoursStart(e.target.value); setHasChanges(true); }}
                  className="bg-[#252d3a] border border-white/10 rounded-lg px-3 py-2 text-white"
                />
              </div>
              <div className="text-gray-500 pt-6">to</div>
              <div>
                <label className="text-sm text-gray-400 block mb-1">End</label>
                <input
                  type="time"
                  value={quietHoursEnd}
                  onChange={(e) => { setQuietHoursEnd(e.target.value); setHasChanges(true); }}
                  className="bg-[#252d3a] border border-white/10 rounded-lg px-3 py-2 text-white"
                />
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Sound */}
      <section className="mb-8 bg-[#1a1f28] rounded-xl border border-white/10 overflow-hidden">
        <div className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {soundEnabled ? <Volume2 className="w-5 h-5 text-gray-400" /> : <VolumeX className="w-5 h-5 text-gray-400" />}
              <div>
                <div className="text-white font-medium">Notification sounds</div>
                <div className="text-sm text-gray-400">Play a sound for new notifications</div>
              </div>
            </div>
            <Toggle enabled={soundEnabled} onChange={(v) => { setSoundEnabled(v); setHasChanges(true); }} />
          </div>
        </div>
      </section>

      {/* Notification Types */}
      {NOTIFICATION_CATEGORIES.map(category => (
        <section key={category.id} className="mb-8 bg-[#1a1f28] rounded-xl border border-white/10 overflow-hidden">
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-medium text-white">{category.name}</h2>
              <p className="text-sm text-gray-400">{category.description}</p>
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => setAllInCategory(category.id, 'both')}
                className="px-2 py-1 text-xs text-gray-400 hover:text-white hover:bg-white/5 rounded"
                title="Enable all"
              >
                All
              </button>
              <button
                onClick={() => setAllInCategory(category.id, 'none')}
                className="px-2 py-1 text-xs text-gray-400 hover:text-white hover:bg-white/5 rounded"
                title="Disable all"
              >
                None
              </button>
            </div>
          </div>
          <div className="divide-y divide-white/5">
            {category.types.map(type => (
              <NotificationTypeRow
                key={type.id}
                type={type}
                value={preferences[type.id] || type.defaultChannel}
                onChange={(channel) => updatePreference(type.id, channel)}
                emailEnabled={emailEnabled}
              />
            ))}
          </div>
        </section>
      ))}

      {/* Save Button */}
      {hasChanges && (
        <div className="fixed bottom-6 right-6 z-50">
          <button
            onClick={savePreferences}
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 
                       disabled:bg-blue-600/50 text-white font-medium rounded-xl shadow-lg
                       transition-colors"
          >
            {isSaving ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : (
              <Save className="w-5 h-5" />
            )}
            Save Changes
          </button>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

function NotificationTypeRow({
  type,
  value,
  onChange,
  emailEnabled,
}: {
  type: NotificationCategory['types'][0];
  value: NotificationChannel;
  onChange: (channel: NotificationChannel) => void;
  emailEnabled: boolean;
}) {
  return (
    <div className="px-4 py-3 flex items-center justify-between">
      <div>
        <div className="text-white text-sm font-medium">{type.name}</div>
        <div className="text-xs text-gray-500">{type.description}</div>
      </div>
      <div className="flex items-center gap-1">
        <ChannelButton
          icon={<Bell className="w-4 h-4" />}
          label="In-app"
          active={value === 'in-app' || value === 'both'}
          onClick={() => {
            if (value === 'both') onChange('email');
            else if (value === 'in-app') onChange('none');
            else if (value === 'email') onChange('both');
            else onChange('in-app');
          }}
        />
        <ChannelButton
          icon={<Mail className="w-4 h-4" />}
          label="Email"
          active={(value === 'email' || value === 'both') && emailEnabled}
          disabled={!emailEnabled}
          onClick={() => {
            if (!emailEnabled) return;
            if (value === 'both') onChange('in-app');
            else if (value === 'email') onChange('none');
            else if (value === 'in-app') onChange('both');
            else onChange('email');
          }}
        />
      </div>
    </div>
  );
}

function ChannelButton({
  icon,
  label,
  active,
  disabled,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`p-2 rounded-lg transition-colors ${
        disabled
          ? 'opacity-50 cursor-not-allowed'
          : active
            ? 'bg-blue-600 text-white'
            : 'bg-white/5 text-gray-400 hover:bg-white/10'
      }`}
      title={label}
    >
      {icon}
    </button>
  );
}

function Toggle({
  enabled,
  onChange,
}: {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      className={`relative w-11 h-6 rounded-full transition-colors ${
        enabled ? 'bg-blue-600' : 'bg-gray-600'
      }`}
    >
      <span
        className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
          enabled ? 'left-6' : 'left-1'
        }`}
      />
    </button>
  );
}
